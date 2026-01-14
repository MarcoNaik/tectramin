# Orphan System Implementation Plan

## Executive Summary

This plan addresses two problems in the task instance orphan detection system:

1. **User Unassignment**: When a user is unassigned from a work order day, their task instances become invisible (not shown to mobile, not detected as orphans by admin)
2. **Orphan Recovery**: When admin removes something (routine, task, etc.) and then re-adds it, orphaned instances can never recover because re-adding creates new IDs

---

## Key Decisions Made

| Decision | Answer |
|----------|--------|
| User unassigned AND task removed - which reason? | Both if possible, otherwise `user_unassigned` |
| Soft-delete dependencies? | Yes |
| Order on reactivation? | Preserve old order |
| Soft-delete `services` table? | No |
| User deleted from Clerk? | Add `"user_deleted"` as separate reason |
| Add composite index for assignments? | Yes |
| Keep `isActive` optional during migration? | Yes |
| Remove empty instances on soft-delete? | No, keep them (they can recover) |
| Mobile app orphan display? | Hide ALL orphans - no orphan shown on mobile |
| Web dashboard? | Show orphan reasons to admin |
| `orphanedAt` field? | Remove it, unnecessary |

---

## Background: Current System

### Data Model Hierarchy

```
customers
  → faenas (work sites)
    → workOrders
      → workOrderDays (each day of work)
        → workOrderDayAssignments (users assigned to day)
        → workOrderDayServices (routines/services assigned to day)
        → workOrderDayTaskTemplates (standalone tasks on day)

services (routine templates)
  → serviceTaskTemplates (tasks within a routine)

taskTemplates (task definitions with fields)
  → fieldTemplates (field definitions)

taskInstances (filled tasks by mobile users)
  → fieldResponses (answers to fields)
```

### Task Instance Schema

```typescript
taskInstances: defineTable({
  clientId: v.string(),                                                      // Offline sync UUID
  workOrderDayId: v.id("workOrderDays"),                                     // Which day
  workOrderDayTaskTemplateId: v.optional(v.id("workOrderDayTaskTemplates")), // For standalone tasks
  workOrderDayServiceId: v.optional(v.id("workOrderDayServices")),           // For routine tasks
  serviceTaskTemplateId: v.optional(v.id("serviceTaskTemplates")),           // For routine tasks
  taskTemplateId: v.id("taskTemplates"),                                     // The task definition
  userId: v.string(),                                                        // Clerk user ID
  instanceLabel: v.optional(v.string()),                                     // For repeatable tasks
  status: v.string(),                                                        // "draft" | "completed"
  startedAt: v.optional(v.number()),
  completedAt: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
```

### Two Types of Task Instances

| Type | Created From | Foreign Keys Set |
|------|--------------|------------------|
| **Standalone** | `workOrderDayTaskTemplates` | `workOrderDayTaskTemplateId` ✓, `workOrderDayServiceId` ✗ |
| **Routine** | `workOrderDayServices` → `serviceTaskTemplates` | `workOrderDayServiceId` ✓, `serviceTaskTemplateId` ✓, `workOrderDayTaskTemplateId` ✗ |

### Current Orphan Detection

Location: `packages/backend/convex/shared/orphanDetection.ts`

```typescript
export async function isTaskInstanceOrphaned(db, instance): Promise<boolean> {
  // For routine tasks
  if (instance.workOrderDayServiceId) {
    const routineOnDay = await db.get(instance.workOrderDayServiceId);
    if (!routineOnDay) return true;  // Routine removed from day

    if (instance.serviceTaskTemplateId) {
      const taskInRoutine = await db.get(instance.serviceTaskTemplateId);
      if (!taskInRoutine) return true;  // Task removed from routine
    }
    return false;
  }

  // For standalone tasks
  if (instance.workOrderDayTaskTemplateId) {
    const standaloneTask = await db.get(instance.workOrderDayTaskTemplateId);
    return !standaloneTask;  // Standalone removed from day
  }

  return true;  // No reference = orphaned
}
```

### Key Principle: Never Delete Orphans

Orphaned task instances are **never deleted**. They are:
- Filtered out from mobile app active workflow
- Shown in a separate "orphaned tasks" section
- Preserved for data integrity (user answers are never lost)

This is critical because this is an **offline-first mobile app** - users may have filled data while offline.

---

## Problem 1: User Unassignment Not Detected as Orphan

### Current Behavior

When admin unassigns a user from a work order day:

1. `workOrderDayAssignments` record is deleted
2. User's task instances remain in database
3. Mobile sync (`getAssignmentsForUser`) no longer returns that day
4. Task instances are NOT detected as orphaned
5. **Result**: Data becomes invisible to everyone

### Why This Is a Problem

- Mobile user can't see their work (day not in assignments)
- Admin can't see it as orphaned (orphan detection doesn't check assignments)
- Data is preserved but effectively "lost"

### Solution

Add user assignment check to orphan detection. Compute it dynamically (not stored).

### Implementation

#### Step 1: Update `isTaskInstanceOrphaned` function

File: `packages/backend/convex/shared/orphanDetection.ts`

```typescript
import type { Id, Doc } from "../_generated/dataModel";
import type { DatabaseReader } from "../_generated/server";

export type OrphanReason = "template_removed" | "user_unassigned" | "user_deleted" | null;

export interface OrphanCheckResult {
  isOrphaned: boolean;
  reason: OrphanReason;
}

export async function checkTaskInstanceOrphanStatus(
  db: DatabaseReader,
  instance: {
    workOrderDayId: Id<"workOrderDays">;
    userId: string;
    workOrderDayServiceId?: Id<"workOrderDayServices">;
    workOrderDayTaskTemplateId?: Id<"workOrderDayTaskTemplates">;
    serviceTaskTemplateId?: Id<"serviceTaskTemplates">;
  }
): Promise<OrphanCheckResult> {
  // Collect all reasons (can have multiple)
  const reasons: OrphanReason[] = [];

  // Check 1: User exists and is assigned?
  const user = await db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", instance.userId))
    .unique();

  if (!user) {
    reasons.push("user_deleted");
  } else {
    // Use composite index (must be added to schema)
    const assignment = await db
      .query("workOrderDayAssignments")
      .withIndex("by_work_order_day_and_user", (q) =>
        q.eq("workOrderDayId", instance.workOrderDayId).eq("userId", user._id)
      )
      .unique();

    if (!assignment) {
      reasons.push("user_unassigned");
    }
  }

  // Check 2: Template structure still exists and is active?
  if (instance.workOrderDayServiceId) {
    const routineOnDay = await db.get(instance.workOrderDayServiceId);
    // Check both existence AND isActive (undefined treated as true for migration)
    if (!routineOnDay || routineOnDay.isActive === false) {
      reasons.push("template_removed");
    } else if (instance.serviceTaskTemplateId) {
      const taskInRoutine = await db.get(instance.serviceTaskTemplateId);
      if (!taskInRoutine || taskInRoutine.isActive === false) {
        reasons.push("template_removed");
      }
    }
  } else if (instance.workOrderDayTaskTemplateId) {
    const standaloneTask = await db.get(instance.workOrderDayTaskTemplateId);
    if (!standaloneTask || standaloneTask.isActive === false) {
      reasons.push("template_removed");
    }
  } else {
    // No template reference at all
    reasons.push("template_removed");
  }

  // Return result - prioritize user_unassigned if multiple reasons
  if (reasons.length === 0) {
    return { isOrphaned: false, reason: null };
  }

  // Priority: user_deleted > user_unassigned > template_removed
  if (reasons.includes("user_deleted")) {
    return { isOrphaned: true, reason: "user_deleted" };
  }
  if (reasons.includes("user_unassigned")) {
    return { isOrphaned: true, reason: "user_unassigned" };
  }
  return { isOrphaned: true, reason: "template_removed" };
}

// Keep old function for backward compatibility, delegates to new one
export async function isTaskInstanceOrphaned(
  db: DatabaseReader,
  instance: {
    workOrderDayId: Id<"workOrderDays">;
    userId: string;
    workOrderDayServiceId?: Id<"workOrderDayServices">;
    workOrderDayTaskTemplateId?: Id<"workOrderDayTaskTemplates">;
    serviceTaskTemplateId?: Id<"serviceTaskTemplates">;
  }
): Promise<boolean> {
  const result = await checkTaskInstanceOrphanStatus(db, instance);
  return result.isOrphaned;
}
```

#### Step 2: Update all call sites to pass `workOrderDayId` and `userId`

Files to update:
- `packages/backend/convex/admin/taskInstances.ts`
- `packages/backend/convex/mobile/sync.ts`

The function now requires `workOrderDayId` and `userId` in addition to existing parameters.

#### Step 3: Update mobile orphan detection

File: `apps/native/src/hooks/useAssignments.ts`

Add check: if instance's `workOrderDayServerId` is not in current assignments, it's orphaned.

```typescript
const orphanedInstances = (allTaskInstances ?? []).filter((ti) => {
  // NEW: Check if we're still assigned to this day
  const dayStillAssigned = (assignments ?? []).some(
    (a) => a.serverId === ti.workOrderDayServerId
  );
  if (!dayStillAssigned) return true;  // User unassigned = orphaned

  // Existing template checks...
  if (ti.workOrderDayServiceServerId) {
    // ... existing logic
  }
  // ...
});
```

File: `apps/native/src/hooks/useTaskInstances.ts`

Same change to the filter logic.

#### Step 4: Update return types to include `orphanReason`

Update queries that return `isOrphaned` to also return `orphanReason`:

**File: `packages/backend/convex/admin/taskInstances.ts` - `listByWorkOrderDay`**

Add `orphanReason` to return validator and handler:

```typescript
returns: v.array(
  v.object({
    // ... existing fields
    isOrphaned: v.boolean(),
    orphanReason: v.union(v.literal("template_removed"), v.literal("user_unassigned"), v.literal("user_deleted"), v.null()),
    // ...
  })
),
```

**File: `packages/backend/convex/mobile/sync.ts` - `getAssignmentsForUser`**

Replace `orphanedAt` with `orphanReason` in `orphanedTasks` validator (line 188-197):

```typescript
orphanedTasks: v.array(
  v.object({
    taskInstanceServerId: v.string(),
    taskInstanceClientId: v.string(),
    taskTemplateServerId: v.string(),
    taskTemplateName: v.string(),
    orphanReason: v.union(v.literal("template_removed"), v.literal("user_unassigned"), v.literal("user_deleted")),
    status: v.string(),
  })
),
```

And update the handler to compute orphanReason instead of orphanedAt (line 342-354):

```typescript
const orphanedTasks = await Promise.all(
  orphanedInstances.map(async (instance) => {
    const template = await ctx.db.get(instance.taskTemplateId);
    const orphanResult = await checkTaskInstanceOrphanStatus(ctx.db, {
      workOrderDayId: day._id,
      userId: args.clerkUserId,
      workOrderDayServiceId: instance.workOrderDayServiceId ?? undefined,
      workOrderDayTaskTemplateId: instance.workOrderDayTaskTemplateId ?? undefined,
      serviceTaskTemplateId: instance.serviceTaskTemplateId ?? undefined,
    });
    return {
      taskInstanceServerId: instance._id as string,
      taskInstanceClientId: instance.clientId,
      taskTemplateServerId: instance.taskTemplateId as string,
      taskTemplateName: template?.name ?? "Unknown",
      orphanReason: orphanResult.reason ?? "template_removed",
      status: instance.status,
    };
  })
);
```

### Behavior After Implementation

| Action | Result |
|--------|--------|
| Admin unassigns user | Next query → `isOrphaned: true, reason: "user_unassigned"` |
| Admin re-assigns same user | Next query → `isOrphaned: false` (auto-recovery) |
| User deleted from Clerk | Next query → `isOrphaned: true, reason: "user_deleted"` |
| User unassigned + task removed | Next query → `isOrphaned: true, reason: "user_unassigned"` (priority) |

### Mobile App Behavior

**IMPORTANT: Mobile app hides ALL orphans. No orphan should ever be shown on mobile.**

File: `apps/native/src/hooks/useAssignments.ts`

The `orphanedTasks` array should still be computed (for sync purposes), but the UI should NEVER display it. Orphans are only visible to admins on the web dashboard.

```typescript
// In the hook - still compute orphans for data integrity
orphanedTasks: orphanedInstances.map(...)

// In the UI components - NEVER render orphanedTasks
// The AssignmentDetailScreen, TaskListScreen, etc. should only show active tasks
```

File: `apps/native/src/hooks/useTaskInstances.ts`

The filter should exclude ALL orphaned instances from the returned list:

```typescript
const enrichedInstances = (instances ?? [])
  .filter((instance) => {
    // Filter out if day not in assignments (user unassigned)
    const dayAssigned = (assignments ?? []).some(
      (a) => a.serverId === instance.workOrderDayServerId
    );
    if (!dayAssigned) return false;

    // Filter out if template removed (existing logic)
    if (instance.workOrderDayServiceServerId) {
      // ... existing routine checks
    }
    // ... existing standalone checks
  });
```

---

## Problem 2: Orphan Recovery When Admin Re-adds Something

### Current Behavior

When admin removes something, task instances become orphaned because they reference the deleted ID:

```
1. Admin removes standalone task
   → workOrderDayTaskTemplates record DELETED (ID: "abc123")
   → taskInstance.workOrderDayTaskTemplateId = "abc123" → orphaned

2. Admin re-adds the SAME task template to the day
   → NEW workOrderDayTaskTemplates record created (ID: "xyz789")
   → Old taskInstance still points to "abc123" → STILL ORPHANED FOREVER
```

### Why This Is a Problem

- Admin accidentally removes task, immediately re-adds it
- User's filled data stays orphaned even though "the same task" exists now
- No way to recover orphaned instances

### Solution: Soft-Delete (Option A)

Instead of hard-deleting linking records, mark them as `isActive: false`. Re-adding reactivates the same record (preserving the ID).

**Why Option A over other options:**

| Option | Handles edge cases? | Trade-off |
|--------|---------------------|-----------|
| **A (Soft-delete)** | ✅ Always correct | Schema migration required |
| B (Re-parent) | ⚠️ Usually correct | Fails if `serviceTaskTemplateId` also deleted |
| C (Path-based) | ❌ Ambiguous | Same task in multiple places causes issues |

**Critical Edge Case that Option A handles correctly:**

Same `taskTemplateId` exists in multiple places (e.g., Routine A + Standalone):
- Both removed, user fills both instances offline
- Admin re-adds only Standalone
- Option A: Only standalone instance recovers (correct)
- Option C: BOTH instances recover (wrong - only one slot exists)

### Implementation

#### Step 1: Schema Migration

File: `packages/backend/convex/schema.ts`

**Add composite index to assignments:**

```typescript
workOrderDayAssignments: defineTable({
  workOrderDayId: v.id("workOrderDays"),
  userId: v.id("users"),
  assignedAt: v.number(),
  assignedBy: v.optional(v.id("users")),
})
  .index("by_work_order_day", ["workOrderDayId"])
  .index("by_user", ["userId"])
  .index("by_work_order_day_and_user", ["workOrderDayId", "userId"]),
```

**Add `isActive` field (optional for migration safety) to 5 linking/dependency tables:**

```typescript
workOrderDayTaskTemplates: defineTable({
  workOrderDayId: v.id("workOrderDays"),
  taskTemplateId: v.id("taskTemplates"),
  order: v.number(),
  isRequired: v.boolean(),
  isActive: v.optional(v.boolean()),
})
  .index("by_work_order_day", ["workOrderDayId"])
  .index("by_task_template", ["taskTemplateId"]),

workOrderDayServices: defineTable({
  workOrderDayId: v.id("workOrderDays"),
  serviceId: v.id("services"),
  order: v.number(),
  createdAt: v.number(),
  isActive: v.optional(v.boolean()),
})
  .index("by_work_order_day", ["workOrderDayId"])
  .index("by_service", ["serviceId"])
  .index("by_work_order_day_and_service", ["workOrderDayId", "serviceId"]),

serviceTaskTemplates: defineTable({
  serviceId: v.id("services"),
  taskTemplateId: v.id("taskTemplates"),
  order: v.number(),
  isRequired: v.boolean(),
  dayNumber: v.optional(v.number()),
  isActive: v.optional(v.boolean()),
})
  .index("by_service", ["serviceId"])
  .index("by_task_template", ["taskTemplateId"])
  .index("by_service_and_day", ["serviceId", "dayNumber"]),

serviceTaskDependencies: defineTable({
  serviceTaskTemplateId: v.id("serviceTaskTemplates"),
  dependsOnServiceTaskTemplateId: v.id("serviceTaskTemplates"),
  serviceId: v.id("services"),
  createdAt: v.number(),
  isActive: v.optional(v.boolean()),
})
  .index("by_dependent", ["serviceTaskTemplateId"])
  .index("by_prerequisite", ["dependsOnServiceTaskTemplateId"])
  .index("by_service", ["serviceId"]),

workOrderDayTaskDependencies: defineTable({
  workOrderDayTaskTemplateId: v.id("workOrderDayTaskTemplates"),
  dependsOnWorkOrderDayTaskTemplateId: v.id("workOrderDayTaskTemplates"),
  workOrderDayId: v.id("workOrderDays"),
  createdAt: v.number(),
  isActive: v.optional(v.boolean()),
})
  .index("by_dependent", ["workOrderDayTaskTemplateId"])
  .index("by_prerequisite", ["dependsOnWorkOrderDayTaskTemplateId"])
  .index("by_work_order_day", ["workOrderDayId"]),
```

**Important:** `isActive` is optional. In all queries:
- `undefined` is treated as `true` (active)
- Only `false` means inactive
- Use pattern: `record.isActive !== false`

#### Step 2: Update "Remove" Mutations to Soft-Delete

**File: `packages/backend/convex/admin/workOrderDays.ts`**

**`removeStandaloneTask` mutation (line 359-372):**

```typescript
export const removeStandaloneTask = mutation({
  args: {
    workOrderDayTaskTemplateId: v.id("workOrderDayTaskTemplates"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const link = await ctx.db.get(args.workOrderDayTaskTemplateId);
    if (!link) {
      throw new Error("Task template link not found");
    }

    const depsAsDependant = await ctx.db
      .query("workOrderDayTaskDependencies")
      .withIndex("by_dependent", (q) => q.eq("workOrderDayTaskTemplateId", args.workOrderDayTaskTemplateId))
      .collect();
    for (const dep of depsAsDependant) {
      await ctx.db.patch(dep._id, { isActive: false });
    }

    const depsAsPrereq = await ctx.db
      .query("workOrderDayTaskDependencies")
      .withIndex("by_prerequisite", (q) => q.eq("dependsOnWorkOrderDayTaskTemplateId", args.workOrderDayTaskTemplateId))
      .collect();
    for (const dep of depsAsPrereq) {
      await ctx.db.patch(dep._id, { isActive: false });
    }

    await ctx.db.patch(args.workOrderDayTaskTemplateId, { isActive: false });
    return null;
  },
});
```

**`removeTaskTemplate` mutation (line 306-325):**

```typescript
export const removeTaskTemplate = mutation({
  args: {
    workOrderDayId: v.id("workOrderDays"),
    taskTemplateId: v.id("taskTemplates"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const link = await ctx.db
      .query("workOrderDayTaskTemplates")
      .withIndex("by_work_order_day", (q) => q.eq("workOrderDayId", args.workOrderDayId))
      .filter((q) => q.eq(q.field("taskTemplateId"), args.taskTemplateId))
      .unique();

    if (link) {
      const depsAsDependant = await ctx.db
        .query("workOrderDayTaskDependencies")
        .withIndex("by_dependent", (q) => q.eq("workOrderDayTaskTemplateId", link._id))
        .collect();
      for (const dep of depsAsDependant) {
        await ctx.db.patch(dep._id, { isActive: false });
      }

      const depsAsPrereq = await ctx.db
        .query("workOrderDayTaskDependencies")
        .withIndex("by_prerequisite", (q) => q.eq("dependsOnWorkOrderDayTaskTemplateId", link._id))
        .collect();
      for (const dep of depsAsPrereq) {
        await ctx.db.patch(dep._id, { isActive: false });
      }

      await ctx.db.patch(link._id, { isActive: false });
    }

    return null;
  },
});
```

**File: `packages/backend/convex/admin/workOrderDayServices.ts`**

**`removeService` mutation (line 117-155):**

```typescript
export const removeService = mutation({
  args: {
    workOrderDayServiceId: v.id("workOrderDayServices"),
  },
  returns: v.object({
    orphanedCount: v.number(),
  }),
  handler: async (ctx, args) => {
    const link = await ctx.db.get(args.workOrderDayServiceId);
    if (!link) {
      throw new Error("Work order day service link not found");
    }

    const instances = await ctx.db
      .query("taskInstances")
      .withIndex("by_work_order_day_service", (q) =>
        q.eq("workOrderDayServiceId", args.workOrderDayServiceId)
      )
      .collect();

    let orphanedCount = 0;
    for (const instance of instances) {
      const responses = await ctx.db
        .query("fieldResponses")
        .withIndex("by_task_instance", (q) => q.eq("taskInstanceId", instance._id))
        .collect();

      if (responses.length > 0 || instance.status === "completed") {
        orphanedCount++;
      }
    }

    await ctx.db.patch(args.workOrderDayServiceId, { isActive: false });

    return { orphanedCount };
  },
});
```

**File: `packages/backend/convex/admin/services.ts`**

**`removeTaskTemplate` mutation (line 289-348):**

```typescript
export const removeTaskTemplate = mutation({
  args: {
    serviceId: v.id("services"),
    taskTemplateId: v.id("taskTemplates"),
  },
  returns: v.object({
    orphanedCount: v.number(),
  }),
  handler: async (ctx, args) => {
    const link = await ctx.db
      .query("serviceTaskTemplates")
      .withIndex("by_service", (q) => q.eq("serviceId", args.serviceId))
      .filter((q) => q.eq(q.field("taskTemplateId"), args.taskTemplateId))
      .unique();

    let orphanedCount = 0;

    if (link) {
      const affectedInstances = await ctx.db
        .query("taskInstances")
        .withIndex("by_service_task_template", (q) => q.eq("serviceTaskTemplateId", link._id))
        .collect();

      for (const instance of affectedInstances) {
        const responses = await ctx.db
          .query("fieldResponses")
          .withIndex("by_task_instance", (q) => q.eq("taskInstanceId", instance._id))
          .collect();

        if (responses.length > 0 || instance.status === "completed") {
          orphanedCount++;
        }
      }

      const depsAsDependant = await ctx.db
        .query("serviceTaskDependencies")
        .withIndex("by_dependent", (q) => q.eq("serviceTaskTemplateId", link._id))
        .collect();
      for (const dep of depsAsDependant) {
        await ctx.db.patch(dep._id, { isActive: false });
      }

      const depsAsPrereq = await ctx.db
        .query("serviceTaskDependencies")
        .withIndex("by_prerequisite", (q) => q.eq("dependsOnServiceTaskTemplateId", link._id))
        .collect();
      for (const dep of depsAsPrereq) {
        await ctx.db.patch(dep._id, { isActive: false });
      }

      await ctx.db.patch(link._id, { isActive: false });
    }

    return { orphanedCount };
  },
});
```

#### Step 3: Update "Add" Mutations to Reactivate if Exists

**File: `packages/backend/convex/admin/workOrderDays.ts`**

**`addTaskTemplate` mutation (line 259-304):**

```typescript
export const addTaskTemplate = mutation({
  args: {
    workOrderDayId: v.id("workOrderDays"),
    taskTemplateId: v.id("taskTemplates"),
    order: v.optional(v.number()),
    isRequired: v.optional(v.boolean()),
  },
  returns: v.id("workOrderDayTaskTemplates"),
  handler: async (ctx, args) => {
    const day = await ctx.db.get(args.workOrderDayId);
    if (!day) {
      throw new Error("Work order day not found");
    }

    const taskTemplate = await ctx.db.get(args.taskTemplateId);
    if (!taskTemplate) {
      throw new Error("Task template not found");
    }

    const existing = await ctx.db
      .query("workOrderDayTaskTemplates")
      .withIndex("by_work_order_day", (q) => q.eq("workOrderDayId", args.workOrderDayId))
      .filter((q) => q.eq(q.field("taskTemplateId"), args.taskTemplateId))
      .unique();

    if (existing) {
      if (existing.isActive !== false) {
        throw new Error("Task template already assigned to this day");
      }

      const depsAsDependant = await ctx.db
        .query("workOrderDayTaskDependencies")
        .withIndex("by_dependent", (q) => q.eq("workOrderDayTaskTemplateId", existing._id))
        .collect();
      for (const dep of depsAsDependant) {
        const prereq = await ctx.db.get(dep.dependsOnWorkOrderDayTaskTemplateId);
        if (prereq && prereq.isActive !== false) {
          await ctx.db.patch(dep._id, { isActive: true });
        }
      }

      await ctx.db.patch(existing._id, {
        isActive: true,
        order: args.order ?? existing.order,
        isRequired: args.isRequired ?? existing.isRequired,
      });
      return existing._id;
    }

    let order = args.order;
    if (order === undefined) {
      const existingLinks = await ctx.db
        .query("workOrderDayTaskTemplates")
        .withIndex("by_work_order_day", (q) => q.eq("workOrderDayId", args.workOrderDayId))
        .filter((q) => q.neq(q.field("isActive"), false))
        .collect();
      order = existingLinks.length;
    }

    return await ctx.db.insert("workOrderDayTaskTemplates", {
      workOrderDayId: args.workOrderDayId,
      taskTemplateId: args.taskTemplateId,
      order,
      isRequired: args.isRequired ?? false,
      isActive: true,
    });
  },
});
```

**File: `packages/backend/convex/admin/workOrderDayServices.ts`**

**`addService` mutation (line 70-115):**

```typescript
export const addService = mutation({
  args: {
    workOrderDayId: v.id("workOrderDays"),
    serviceId: v.id("services"),
    order: v.optional(v.number()),
  },
  returns: v.id("workOrderDayServices"),
  handler: async (ctx, args) => {
    const day = await ctx.db.get(args.workOrderDayId);
    if (!day) {
      throw new Error("Work order day not found");
    }

    const service = await ctx.db.get(args.serviceId);
    if (!service) {
      throw new Error("Service not found");
    }

    const existing = await ctx.db
      .query("workOrderDayServices")
      .withIndex("by_work_order_day_and_service", (q) =>
        q.eq("workOrderDayId", args.workOrderDayId).eq("serviceId", args.serviceId)
      )
      .unique();

    if (existing) {
      if (existing.isActive !== false) {
        throw new Error("Service already linked to this work order day");
      }

      await ctx.db.patch(existing._id, {
        isActive: true,
        order: args.order ?? existing.order,
      });
      return existing._id;
    }

    let order = args.order;
    if (order === undefined) {
      const existingLinks = await ctx.db
        .query("workOrderDayServices")
        .withIndex("by_work_order_day", (q) => q.eq("workOrderDayId", args.workOrderDayId))
        .filter((q) => q.neq(q.field("isActive"), false))
        .collect();
      order = existingLinks.length;
    }

    return await ctx.db.insert("workOrderDayServices", {
      workOrderDayId: args.workOrderDayId,
      serviceId: args.serviceId,
      order,
      createdAt: Date.now(),
      isActive: true,
    });
  },
});
```

**File: `packages/backend/convex/admin/services.ts`**

**`addTaskTemplate` mutation (line 226-264):**

```typescript
export const addTaskTemplate = mutation({
  args: {
    serviceId: v.id("services"),
    taskTemplateId: v.id("taskTemplates"),
    order: v.number(),
    isRequired: v.boolean(),
    dayNumber: v.optional(v.number()),
  },
  returns: v.id("serviceTaskTemplates"),
  handler: async (ctx, args) => {
    const service = await ctx.db.get(args.serviceId);
    if (!service) {
      throw new Error("Service not found");
    }

    const taskTemplate = await ctx.db.get(args.taskTemplateId);
    if (!taskTemplate) {
      throw new Error("Task template not found");
    }

    const existing = await ctx.db
      .query("serviceTaskTemplates")
      .withIndex("by_service", (q) => q.eq("serviceId", args.serviceId))
      .filter((q) => q.eq(q.field("taskTemplateId"), args.taskTemplateId))
      .unique();

    if (existing) {
      if (existing.isActive !== false) {
        throw new Error("Task template already linked to service");
      }

      const depsAsDependant = await ctx.db
        .query("serviceTaskDependencies")
        .withIndex("by_dependent", (q) => q.eq("serviceTaskTemplateId", existing._id))
        .collect();
      for (const dep of depsAsDependant) {
        const prereq = await ctx.db.get(dep.dependsOnServiceTaskTemplateId);
        if (prereq && prereq.isActive !== false) {
          await ctx.db.patch(dep._id, { isActive: true });
        }
      }

      await ctx.db.patch(existing._id, {
        isActive: true,
        order: args.order,
        isRequired: args.isRequired,
        dayNumber: args.dayNumber,
      });
      return existing._id;
    }

    return await ctx.db.insert("serviceTaskTemplates", {
      serviceId: args.serviceId,
      taskTemplateId: args.taskTemplateId,
      order: args.order,
      isRequired: args.isRequired,
      dayNumber: args.dayNumber,
      isActive: true,
    });
  },
});
```

#### Step 4: Update All Queries to Filter Active Records

**Helper pattern (use consistently across all files):**

```typescript
.filter((q) => q.neq(q.field("isActive"), false))
```

**File: `packages/backend/convex/admin/workOrderDays.ts`**

| Query | Line | Change |
|-------|------|--------|
| `getWithTaskTemplates` | 80-83 | Add `.filter((q) => q.neq(q.field("isActive"), false))` after `withIndex` |
| `getWithDetails` | 174-177 | Add filter to `workOrderDayTaskTemplates` query |
| `listStandaloneTasks` | 338-341 | Add filter to query |

**File: `packages/backend/convex/admin/workOrderDayServices.ts`**

| Query | Line | Change |
|-------|------|--------|
| `listByDay` | 27-30 | Add `.filter((q) => q.neq(q.field("isActive"), false))` |
| `getServicesWithTasks` | 198-201 | Add filter to `workOrderDayServices` query |

**File: `packages/backend/convex/admin/services.ts`**

| Query | Line | Change |
|-------|------|--------|
| `getWithTaskTemplates` | 102-105 | Add filter to `serviceTaskTemplates` query |
| `getWithTaskTemplates` | 107-110 | Add filter to `serviceTaskDependencies` query |

**File: `packages/backend/convex/mobile/sync.ts`**

| Query | Line | Change |
|-------|------|--------|
| `getAssignmentsForUser` - dayServices | 226-229 | Add filter to `workOrderDayServices` query |
| `getAssignmentsForUser` - serviceTaskTemplates | 235-238 | Add filter to `serviceTaskTemplates` query |
| `getAssignmentsForUser` - standaloneDayTaskTemplates | 291-294 | Add filter to `workOrderDayTaskTemplates` query |
| `getTaskDependenciesForUser` | 729-732 | Add filter to `workOrderDayTaskDependencies` query |

**Example change in `sync.ts` `getAssignmentsForUser`:**

```typescript
const dayServices = await ctx.db
  .query("workOrderDayServices")
  .withIndex("by_work_order_day", (q) => q.eq("workOrderDayId", day._id))
  .filter((q) => q.neq(q.field("isActive"), false))
  .collect();

const serviceTaskTemplates = await ctx.db
  .query("serviceTaskTemplates")
  .withIndex("by_service", (q) => q.eq("serviceId", ds.serviceId))
  .filter((q) => q.neq(q.field("isActive"), false))
  .collect();

const standaloneDayTaskTemplates = await ctx.db
  .query("workOrderDayTaskTemplates")
  .withIndex("by_work_order_day", (q) => q.eq("workOrderDayId", day._id))
  .filter((q) => q.neq(q.field("isActive"), false))
  .collect();
```

#### Step 5: Update Orphan Detection

File: `packages/backend/convex/shared/orphanDetection.ts`

The orphan detection checks `isActive !== false`:

```typescript
if (instance.workOrderDayServiceId) {
  const routineOnDay = await db.get(instance.workOrderDayServiceId);
  if (!routineOnDay || routineOnDay.isActive === false) {
    reasons.push("template_removed");
  } else if (instance.serviceTaskTemplateId) {
    const taskInRoutine = await db.get(instance.serviceTaskTemplateId);
    if (!taskInRoutine || taskInRoutine.isActive === false) {
      reasons.push("template_removed");
    }
  }
} else if (instance.workOrderDayTaskTemplateId) {
  const standaloneTask = await db.get(instance.workOrderDayTaskTemplateId);
  if (!standaloneTask || standaloneTask.isActive === false) {
    reasons.push("template_removed");
  }
} else {
  reasons.push("template_removed");
}
```

### Behavior After Implementation

| Action | Before (Hard Delete) | After (Soft Delete) |
|--------|---------------------|---------------------|
| Remove standalone task | ID deleted, orphaned forever | ID preserved but inactive |
| Re-add same task | New ID created, still orphaned | Same ID reactivated, orphan recovers |
| Remove routine from day | ID deleted, orphaned forever | ID preserved but inactive |
| Re-add same routine | New ID created, still orphaned | Same ID reactivated, orphan recovers |
| Remove task from routine | ID deleted, orphaned forever | ID preserved but inactive |
| Re-add same task to routine | New ID created, still orphaned | Same ID reactivated, orphan recovers |

---

## Web Dashboard Changes

The admin web dashboard should display orphan reasons to help admins understand and recover orphaned instances.

### Display Requirements

File: `apps/web/src/components/debug/WorkOrdersTab.tsx` and `apps/web/src/components/grid-view/GridView.tsx`

```typescript
// Show orphan reason with appropriate messaging
{ti.isOrphaned && (
  <span className="text-orange-400">
    {ti.orphanReason === "user_unassigned" && "| Usuario desasignado"}
    {ti.orphanReason === "user_deleted" && "| Usuario eliminado"}
    {ti.orphanReason === "template_removed" && "| Tarea eliminada"}
  </span>
)}
```

### Admin Actions

For `user_unassigned` orphans:
- Show button to re-assign user (which will auto-recover the instances)

For `template_removed` orphans:
- Show info that re-adding the same task/routine will recover instances
- Once soft-delete is implemented, this happens automatically

---

## Files to Modify Summary

### Problem 1 (User Unassignment)

| File | Changes |
|------|---------|
| `packages/backend/convex/schema.ts` | Add composite index `by_work_order_day_and_user` to `workOrderDayAssignments` |
| `packages/backend/convex/shared/orphanDetection.ts` | Add `checkTaskInstanceOrphanStatus`, add `OrphanReason` type (with `user_deleted`), require `workOrderDayId` and `userId` |
| `packages/backend/convex/admin/taskInstances.ts` | Update `listByWorkOrderDay` call sites, add `orphanReason` to return types |
| `packages/backend/convex/mobile/sync.ts` | Update `getAssignmentsForUser` call sites, add `orphanReason` to `orphanedTasks` return type |
| `apps/native/src/hooks/useAssignments.ts` | Add assignment check to orphan detection, ensure orphans hidden from UI |
| `apps/native/src/hooks/useTaskInstances.ts` | Add assignment check to orphan detection, ensure orphans hidden from UI |
| `apps/web/src/components/debug/WorkOrdersTab.tsx` | Display `orphanReason` to admin |
| `apps/web/src/components/grid-view/GridView.tsx` | Display `orphanReason` to admin |

### Problem 2 (Orphan Recovery)

| File | Changes |
|------|---------|
| `packages/backend/convex/schema.ts` | Add `isActive: v.optional(v.boolean())` to 5 tables |
| `packages/backend/convex/admin/workOrderDays.ts` | See table below |
| `packages/backend/convex/admin/workOrderDayServices.ts` | See table below |
| `packages/backend/convex/admin/services.ts` | See table below |
| `packages/backend/convex/mobile/sync.ts` | See table below |
| `packages/backend/convex/shared/orphanDetection.ts` | Check `isActive === false` in addition to existence |
| `packages/backend/convex/shared/taskInstanceCreation.ts` | **NEW FILE** - Unified task instance creation helpers |

#### Detailed Changes by File

**`packages/backend/convex/schema.ts`**

| Table | Change |
|-------|--------|
| `workOrderDayAssignments` | Add index `.index("by_work_order_day_and_user", ["workOrderDayId", "userId"])` |
| `workOrderDayTaskTemplates` | Add field `isActive: v.optional(v.boolean())` |
| `workOrderDayServices` | Add field `isActive: v.optional(v.boolean())` |
| `serviceTaskTemplates` | Add field `isActive: v.optional(v.boolean())` |
| `serviceTaskDependencies` | Add field `isActive: v.optional(v.boolean())` |
| `workOrderDayTaskDependencies` | Add field `isActive: v.optional(v.boolean())` |

**`packages/backend/convex/admin/workOrderDays.ts`**

| Function | Change |
|----------|--------|
| `addTaskTemplate` | Check for inactive existing, reactivate with dependencies, add `isActive: true` on insert, **call `createInstancesForStandaloneTaskOnDay()`** |
| `removeTaskTemplate` | Soft-delete link + dependencies with `isActive: false` |
| `removeStandaloneTask` | Soft-delete link + dependencies with `isActive: false` |
| `getWithTaskTemplates` | Add `.filter((q) => q.neq(q.field("isActive"), false))` |
| `getWithDetails` | Add filter to `workOrderDayTaskTemplates` query |
| `listStandaloneTasks` | Add filter to query |

**`packages/backend/convex/admin/workOrderDayServices.ts`**

| Function | Change |
|----------|--------|
| `addService` | Check for inactive existing, reactivate, add `isActive: true` on insert, **call `createInstancesForRoutineOnDay()`** |
| `removeService` | Soft-delete with `isActive: false` (remove `ctx.db.delete`) |
| `listByDay` | Add `.filter((q) => q.neq(q.field("isActive"), false))` |
| `getServicesWithTasks` | Add filter to `workOrderDayServices` query |

**`packages/backend/convex/admin/services.ts`**

| Function | Change |
|----------|--------|
| `addTaskTemplate` | Check for inactive existing, reactivate with dependencies, add `isActive: true` on insert, **call `createInstancesForNewRoutineTask()`** |
| `removeTaskTemplate` | Soft-delete link + dependencies with `isActive: false` (remove all `ctx.db.delete`) |
| `getWithTaskTemplates` | Add filter to `serviceTaskTemplates` and `serviceTaskDependencies` queries |

**`packages/backend/convex/admin/assignments.ts`**

| Function | Change |
|----------|--------|
| `assign` | **Refactored** - Use `createTaskInstancesForUser()` helper |
| `bulkAssign` | **Refactored** - Use `getApplicableTasksForDay()` + `createTaskInstancesForUser()` helpers |
| `replaceAssignments` | **Refactored** - Use `getApplicableTasksForDay()` + `createTaskInstancesForUser()` helpers |

**`packages/backend/convex/shared/taskInstanceCreation.ts`** (NEW FILE)

| Function | Purpose |
|----------|---------|
| `getApplicableTasksForDay()` | Fetches all active routine + standalone tasks for a day |
| `createTaskInstancesForUser()` | Creates instances for a user (used when assigning) |
| `createInstancesForRoutineOnDay()` | Creates instances for all assigned users when routine added |
| `createInstancesForStandaloneTaskOnDay()` | Creates instances for all assigned users when standalone task added |
| `createInstancesForNewRoutineTask()` | Creates instances across all days when task added to routine |

**`packages/backend/convex/mobile/sync.ts`**

| Function | Change |
|----------|--------|
| `getAssignmentsForUser` | Add filter to `workOrderDayServices`, `serviceTaskTemplates`, `workOrderDayTaskTemplates` queries |
| `getTaskDependenciesForUser` | Add filter to `workOrderDayTaskDependencies` query |

---

## Testing Checklist

### User Unassignment Tests

- [ ] Unassign user → task instances detected as orphaned with `reason: "user_unassigned"`
- [ ] Re-assign same user → task instances no longer orphaned (auto-recovery)
- [ ] Delete user from Clerk → task instances detected as orphaned with `reason: "user_deleted"`
- [ ] Mobile hides ALL orphaned tasks (none shown on mobile)
- [ ] Admin sees orphan reason in web dashboard

### Orphan Recovery Tests (Soft-Delete)

- [ ] Remove standalone task → instances orphaned, `workOrderDayTaskTemplates.isActive = false`
- [ ] Re-add same standalone task → instances recover (same ID), `isActive = true`
- [ ] Remove routine from day → instances orphaned, `workOrderDayServices.isActive = false`
- [ ] Re-add same routine → instances recover (same ID), `isActive = true`
- [ ] Remove task from routine → instances orphaned, `serviceTaskTemplates.isActive = false`
- [ ] Re-add same task to routine → instances recover (same ID), `isActive = true`

### Dependency Tests

- [ ] Remove standalone task with dependencies → dependencies also soft-deleted
- [ ] Re-add standalone task → dependencies reactivated only if prerequisite is active
- [ ] Remove task from routine with dependencies → dependencies also soft-deleted
- [ ] Re-add task to routine → dependencies reactivated only if prerequisite is active

### Query Filtering Tests

- [ ] `listByDay` returns only active services
- [ ] `listStandaloneTasks` returns only active tasks
- [ ] `getWithTaskTemplates` returns only active task templates
- [ ] `getServicesWithTasks` returns only active services
- [ ] `getAssignmentsForUser` returns only active routines and standalone tasks
- [ ] Inactive records don't appear in any UI

### Edge Case Tests

- [ ] Same `taskTemplateId` in Routine A + Standalone, both removed, only Standalone re-added → only standalone instances recover
- [ ] Same `taskTemplateId` in Routine A + Routine B, both removed, only Routine B re-added → only Routine B instances recover
- [ ] User unassigned + task removed → shows `user_unassigned` (priority)
- [ ] User re-assigned but task still removed → shows `template_removed`
- [ ] Existing data without `isActive` field works correctly (treated as active)
- [ ] Try to add already-active task → throws error "already assigned"
- [ ] Order preserved on reactivation

---

## Unified Task Instance Creation System (Implemented)

### Background

When admin adds tasks/routines, task instances must be created for all currently assigned users. Previously, instance creation only occurred when assigning users to a day, leaving a gap:

| Scenario | Before | After |
|----------|--------|-------|
| User assigned to day | ✅ Instances created | ✅ Instances created |
| Routine added to day with users | ❌ No instances | ✅ Instances created |
| Standalone task added to day with users | ❌ No instances | ✅ Instances created |
| Task added to routine already on days | ❌ No instances | ✅ Instances created |

### Implementation

#### New Helper File

File: `packages/backend/convex/shared/taskInstanceCreation.ts`

This file centralizes all task instance creation logic with 4 exported functions:

```typescript
interface RoutineTask {
  dayServiceId: Id<"workOrderDayServices">;
  serviceTaskTemplateId: Id<"serviceTaskTemplates">;
  taskTemplateId: Id<"taskTemplates">;
  name: string | undefined;
}

interface StandaloneTask {
  workOrderDayTaskTemplateId: Id<"workOrderDayTaskTemplates">;
  taskTemplateId: Id<"taskTemplates">;
  name: string | undefined;
}

interface ApplicableTasks {
  routineTasks: RoutineTask[];
  standaloneTasks: StandaloneTask[];
}

// 1. Get all applicable tasks for a work order day
export async function getApplicableTasksForDay(
  ctx: MutationCtx,
  workOrderDayId: Id<"workOrderDays">
): Promise<ApplicableTasks>

// 2. Create instances for a single user (used when assigning user)
export async function createTaskInstancesForUser(
  ctx: MutationCtx,
  workOrderDayId: Id<"workOrderDays">,
  clerkId: string,
  applicableTasks?: ApplicableTasks
): Promise<void>

// 3. Create instances for all assigned users when routine added to day
export async function createInstancesForRoutineOnDay(
  ctx: MutationCtx,
  workOrderDayId: Id<"workOrderDays">,
  workOrderDayServiceId: Id<"workOrderDayServices">,
  serviceId: Id<"services">
): Promise<void>

// 4. Create instances for all assigned users when standalone task added to day
export async function createInstancesForStandaloneTaskOnDay(
  ctx: MutationCtx,
  workOrderDayId: Id<"workOrderDays">,
  workOrderDayTaskTemplateId: Id<"workOrderDayTaskTemplates">,
  taskTemplateId: Id<"taskTemplates">
): Promise<void>

// 5. Create instances across ALL days using a routine when task added to routine
export async function createInstancesForNewRoutineTask(
  ctx: MutationCtx,
  serviceId: Id<"services">,
  serviceTaskTemplateId: Id<"serviceTaskTemplates">,
  taskTemplateId: Id<"taskTemplates">,
  dayNumber?: number
): Promise<void>
```

#### Updated Mutations

| File | Mutation | Helper Used |
|------|----------|-------------|
| `admin/assignments.ts` | `assign` | `createTaskInstancesForUser()` |
| `admin/assignments.ts` | `bulkAssign` | `getApplicableTasksForDay()` + `createTaskInstancesForUser()` |
| `admin/assignments.ts` | `replaceAssignments` | `getApplicableTasksForDay()` + `createTaskInstancesForUser()` |
| `admin/workOrderDayServices.ts` | `addService` | `createInstancesForRoutineOnDay()` |
| `admin/workOrderDays.ts` | `addTaskTemplate` | `createInstancesForStandaloneTaskOnDay()` |
| `admin/services.ts` | `addTaskTemplate` | `createInstancesForNewRoutineTask()` |

#### Key Design Decisions

1. **Includes `isActive` filters**: All queries in the helper filter out soft-deleted records using `.filter((q) => q.neq(q.field("isActive"), false))`

2. **Respects `dayNumber`**: Routine tasks with a specific `dayNumber` only create instances on days matching that number

3. **Prevents duplicates**: Each helper checks for existing instances before creating new ones

4. **Caches applicable tasks**: For bulk operations, `getApplicableTasksForDay()` is called once and passed to `createTaskInstancesForUser()` to avoid redundant queries

5. **Mobile fallback preserved**: Mobile app can still create instances on-demand when user taps "Start" as a fallback

### Behavior After Implementation

| Admin Action | Result |
|--------------|--------|
| Assign user to day | Instances created for all active routines + standalone tasks |
| Add routine to day with 3 assigned users | 3 × (routine tasks) instances created |
| Add standalone task to day with 3 assigned users | 3 instances created |
| Add task to routine used on 5 days × 2 users each | 10 instances created |
| Reactivate soft-deleted routine | Same as adding - instances created for assigned users |
| Reactivate soft-deleted task in routine | Same as adding - instances created across all days |

### Testing Checklist

- [x] Assign user → instances created for all tasks on day
- [x] Bulk assign users → instances created efficiently (single query for applicable tasks)
- [x] Add routine to day with users → instances created for each user
- [x] Add standalone task to day with users → instances created for each user
- [x] Add task to routine on multiple days → instances created across all days
- [x] Task with `dayNumber` filter → only creates on matching days
- [x] Reactivate soft-deleted routine → creates instances (recovery + creation)
- [x] Reactivate soft-deleted task → creates instances (recovery + creation)
- [x] TypeScript compiles without errors

---

## Rollback Plan

If issues arise:

1. **Problem 1 (User Unassignment)**:
   - Revert `orphanDetection.ts` to old `isTaskInstanceOrphaned` function
   - Remove `orphanReason` from return types
   - Mobile and web will continue working without user unassignment detection

2. **Problem 2 (Soft Delete)**:
   - Keep `isActive` field in schema (don't remove)
   - Remove `.filter((q) => q.neq(q.field("isActive"), false))` from queries
   - Change remove mutations back to `ctx.db.delete()`
   - Change add mutations to not check for inactive existing
   - Soft-deleted records during rollback period will stay inactive but won't cause issues
   - New orphans created after rollback won't be recoverable (back to current behavior)

3. **Both Problems**:
   - Schema changes (new fields, new index) can remain - they don't break anything
   - Only the logic changes need to be reverted
