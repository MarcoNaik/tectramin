import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

const assignmentValidator = v.object({
  _id: v.id("workOrderDayAssignments"),
  _creationTime: v.number(),
  workOrderDayId: v.id("workOrderDays"),
  userId: v.id("users"),
  assignedAt: v.number(),
  assignedBy: v.optional(v.id("users")),
});

export const listByWorkOrderDay = query({
  args: { workOrderDayId: v.id("workOrderDays") },
  returns: v.array(
    v.object({
      _id: v.id("workOrderDayAssignments"),
      _creationTime: v.number(),
      workOrderDayId: v.id("workOrderDays"),
      userId: v.id("users"),
      userFullName: v.optional(v.string()),
      userEmail: v.string(),
      assignedAt: v.number(),
      assignedBy: v.optional(v.id("users")),
    })
  ),
  handler: async (ctx, args) => {
    const assignments = await ctx.db
      .query("workOrderDayAssignments")
      .withIndex("by_work_order_day", (q) => q.eq("workOrderDayId", args.workOrderDayId))
      .collect();

    return Promise.all(
      assignments.map(async (a) => {
        const user = await ctx.db.get(a.userId);
        return {
          ...a,
          userFullName: user?.fullName,
          userEmail: user?.email ?? "Unknown",
        };
      })
    );
  },
});

export const listByUser = query({
  args: { userId: v.id("users") },
  returns: v.array(
    v.object({
      _id: v.id("workOrderDayAssignments"),
      _creationTime: v.number(),
      workOrderDayId: v.id("workOrderDays"),
      dayDate: v.number(),
      dayNumber: v.number(),
      dayStatus: v.string(),
      workOrderId: v.id("workOrders"),
      workOrderName: v.string(),
      customerName: v.string(),
      faenaName: v.string(),
      assignedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const assignments = await ctx.db
      .query("workOrderDayAssignments")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    return Promise.all(
      assignments.map(async (a) => {
        const day = await ctx.db.get(a.workOrderDayId);
        if (!day) {
          throw new Error("Day not found");
        }

        const workOrder = await ctx.db.get(day.workOrderId);
        if (!workOrder) {
          throw new Error("Work order not found");
        }

        const customer = await ctx.db.get(workOrder.customerId);
        const faena = await ctx.db.get(workOrder.faenaId);

        return {
          _id: a._id,
          _creationTime: a._creationTime,
          workOrderDayId: a.workOrderDayId,
          dayDate: day.dayDate,
          dayNumber: day.dayNumber,
          dayStatus: day.status,
          workOrderId: workOrder._id,
          workOrderName: workOrder.name,
          customerName: customer?.name ?? "Unknown",
          faenaName: faena?.name ?? "Unknown",
          assignedAt: a.assignedAt,
        };
      })
    );
  },
});

export const listByUserAndDateRange = query({
  args: {
    userId: v.id("users"),
    startDate: v.number(),
    endDate: v.number(),
  },
  returns: v.array(
    v.object({
      _id: v.id("workOrderDayAssignments"),
      workOrderDayId: v.id("workOrderDays"),
      dayDate: v.number(),
      dayNumber: v.number(),
      dayStatus: v.string(),
      workOrderId: v.id("workOrders"),
      workOrderName: v.string(),
      customerName: v.string(),
      faenaName: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    const assignments = await ctx.db
      .query("workOrderDayAssignments")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const results = await Promise.all(
      assignments.map(async (a) => {
        const day = await ctx.db.get(a.workOrderDayId);
        if (!day) return null;

        if (day.dayDate < args.startDate || day.dayDate > args.endDate) {
          return null;
        }

        const workOrder = await ctx.db.get(day.workOrderId);
        if (!workOrder) return null;

        const customer = await ctx.db.get(workOrder.customerId);
        const faena = await ctx.db.get(workOrder.faenaId);

        return {
          _id: a._id,
          workOrderDayId: a.workOrderDayId,
          dayDate: day.dayDate,
          dayNumber: day.dayNumber,
          dayStatus: day.status,
          workOrderId: workOrder._id,
          workOrderName: workOrder.name,
          customerName: customer?.name ?? "Unknown",
          faenaName: faena?.name ?? "Unknown",
        };
      })
    );

    return results.filter((r): r is NonNullable<typeof r> => r !== null);
  },
});

export const assign = mutation({
  args: {
    workOrderDayId: v.id("workOrderDays"),
    userId: v.id("users"),
    assignedBy: v.optional(v.id("users")),
  },
  returns: v.id("workOrderDayAssignments"),
  handler: async (ctx, args) => {
    const day = await ctx.db.get(args.workOrderDayId);
    if (!day) {
      throw new Error("Work order day not found");
    }

    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    const existing = await ctx.db
      .query("workOrderDayAssignments")
      .withIndex("by_work_order_day", (q) => q.eq("workOrderDayId", args.workOrderDayId))
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .unique();

    if (existing) {
      throw new Error("User already assigned to this day");
    }

    return await ctx.db.insert("workOrderDayAssignments", {
      workOrderDayId: args.workOrderDayId,
      userId: args.userId,
      assignedAt: Date.now(),
      assignedBy: args.assignedBy,
    });
  },
});

export const unassign = mutation({
  args: {
    workOrderDayId: v.id("workOrderDays"),
    userId: v.id("users"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const assignment = await ctx.db
      .query("workOrderDayAssignments")
      .withIndex("by_work_order_day", (q) => q.eq("workOrderDayId", args.workOrderDayId))
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .unique();

    if (assignment) {
      await ctx.db.delete(assignment._id);
    }

    return null;
  },
});

export const bulkAssign = mutation({
  args: {
    workOrderDayId: v.id("workOrderDays"),
    userIds: v.array(v.id("users")),
    assignedBy: v.optional(v.id("users")),
  },
  returns: v.array(v.id("workOrderDayAssignments")),
  handler: async (ctx, args) => {
    const day = await ctx.db.get(args.workOrderDayId);
    if (!day) {
      throw new Error("Work order day not found");
    }

    const existingAssignments = await ctx.db
      .query("workOrderDayAssignments")
      .withIndex("by_work_order_day", (q) => q.eq("workOrderDayId", args.workOrderDayId))
      .collect();

    const existingUserIds = new Set(existingAssignments.map((a) => a.userId));
    const now = Date.now();
    const newAssignmentIds: Array<typeof day._id extends infer T ? T : never> = [];

    for (const userId of args.userIds) {
      if (existingUserIds.has(userId)) {
        continue;
      }

      const user = await ctx.db.get(userId);
      if (!user) {
        throw new Error(`User ${userId} not found`);
      }

      const id = await ctx.db.insert("workOrderDayAssignments", {
        workOrderDayId: args.workOrderDayId,
        userId,
        assignedAt: now,
        assignedBy: args.assignedBy,
      });
      newAssignmentIds.push(id as typeof newAssignmentIds[number]);
    }

    return newAssignmentIds as Array<typeof args.workOrderDayId>;
  },
});

export const bulkUnassign = mutation({
  args: {
    workOrderDayId: v.id("workOrderDays"),
    userIds: v.array(v.id("users")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const assignments = await ctx.db
      .query("workOrderDayAssignments")
      .withIndex("by_work_order_day", (q) => q.eq("workOrderDayId", args.workOrderDayId))
      .collect();

    const userIdSet = new Set(args.userIds.map((id) => id.toString()));

    for (const assignment of assignments) {
      if (userIdSet.has(assignment.userId.toString())) {
        await ctx.db.delete(assignment._id);
      }
    }

    return null;
  },
});

export const replaceAssignments = mutation({
  args: {
    workOrderDayId: v.id("workOrderDays"),
    userIds: v.array(v.id("users")),
    assignedBy: v.optional(v.id("users")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const day = await ctx.db.get(args.workOrderDayId);
    if (!day) {
      throw new Error("Work order day not found");
    }

    const existingAssignments = await ctx.db
      .query("workOrderDayAssignments")
      .withIndex("by_work_order_day", (q) => q.eq("workOrderDayId", args.workOrderDayId))
      .collect();

    for (const assignment of existingAssignments) {
      await ctx.db.delete(assignment._id);
    }

    const now = Date.now();

    for (const userId of args.userIds) {
      const user = await ctx.db.get(userId);
      if (!user) {
        throw new Error(`User ${userId} not found`);
      }

      await ctx.db.insert("workOrderDayAssignments", {
        workOrderDayId: args.workOrderDayId,
        userId,
        assignedAt: now,
        assignedBy: args.assignedBy,
      });
    }

    return null;
  },
});
