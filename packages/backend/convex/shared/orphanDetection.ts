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
  const reasons: OrphanReason[] = [];

  const user = await db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", instance.userId))
    .unique();

  if (!user) {
    reasons.push("user_deleted");
  } else {
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

  if (reasons.length === 0) {
    return { isOrphaned: false, reason: null };
  }

  if (reasons.includes("user_deleted")) {
    return { isOrphaned: true, reason: "user_deleted" };
  }
  if (reasons.includes("user_unassigned")) {
    return { isOrphaned: true, reason: "user_unassigned" };
  }
  return { isOrphaned: true, reason: "template_removed" };
}

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

export async function filterNonOrphanedInstances<T extends Doc<"taskInstances">>(
  db: DatabaseReader,
  instances: T[]
): Promise<T[]> {
  const results: T[] = [];

  for (const instance of instances) {
    const orphaned = await isTaskInstanceOrphaned(db, {
      workOrderDayId: instance.workOrderDayId,
      userId: instance.userId,
      workOrderDayServiceId: instance.workOrderDayServiceId ?? undefined,
      workOrderDayTaskTemplateId: instance.workOrderDayTaskTemplateId ?? undefined,
      serviceTaskTemplateId: instance.serviceTaskTemplateId ?? undefined,
    });

    if (!orphaned) {
      results.push(instance);
    }
  }

  return results;
}

export async function getOrphanedInstances<T extends Doc<"taskInstances">>(
  db: DatabaseReader,
  instances: T[]
): Promise<T[]> {
  const results: T[] = [];

  for (const instance of instances) {
    const orphaned = await isTaskInstanceOrphaned(db, {
      workOrderDayId: instance.workOrderDayId,
      userId: instance.userId,
      workOrderDayServiceId: instance.workOrderDayServiceId ?? undefined,
      workOrderDayTaskTemplateId: instance.workOrderDayTaskTemplateId ?? undefined,
      serviceTaskTemplateId: instance.serviceTaskTemplateId ?? undefined,
    });

    if (orphaned) {
      results.push(instance);
    }
  }

  return results;
}
