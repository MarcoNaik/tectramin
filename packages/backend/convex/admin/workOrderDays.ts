import { query, mutation } from "../_generated/server";
import { v } from "convex/values";

const workOrderDayValidator = v.object({
  _id: v.id("workOrderDays"),
  _creationTime: v.number(),
  workOrderId: v.id("workOrders"),
  dayDate: v.number(),
  dayNumber: v.number(),
  status: v.string(),
  requiredPeople: v.optional(v.number()),
  notes: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
});

export const listByWorkOrder = query({
  args: { workOrderId: v.id("workOrders") },
  returns: v.array(workOrderDayValidator),
  handler: async (ctx, args) => {
    const days = await ctx.db
      .query("workOrderDays")
      .withIndex("by_work_order", (q) => q.eq("workOrderId", args.workOrderId))
      .collect();
    return days.sort((a, b) => a.dayNumber - b.dayNumber);
  },
});

export const listByDate = query({
  args: { dayDate: v.number() },
  returns: v.array(workOrderDayValidator),
  handler: async (ctx, args) => {
    const startOfDay = new Date(args.dayDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    return await ctx.db
      .query("workOrderDays")
      .withIndex("by_date", (q) =>
        q.gte("dayDate", startOfDay.getTime()).lt("dayDate", endOfDay.getTime())
      )
      .collect();
  },
});

export const get = query({
  args: { id: v.id("workOrderDays") },
  returns: v.union(workOrderDayValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getWithTaskTemplates = query({
  args: { id: v.id("workOrderDays") },
  returns: v.union(
    v.object({
      day: workOrderDayValidator,
      taskTemplates: v.array(
        v.object({
          _id: v.id("workOrderDayTaskTemplates"),
          taskTemplateId: v.id("taskTemplates"),
          taskTemplateName: v.string(),
          taskTemplateDescription: v.optional(v.string()),
          order: v.number(),
          isRequired: v.boolean(),
          fieldCount: v.number(),
        })
      ),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const day = await ctx.db.get(args.id);
    if (!day) {
      return null;
    }

    const links = await ctx.db
      .query("workOrderDayTaskTemplates")
      .withIndex("by_work_order_day", (q) => q.eq("workOrderDayId", args.id))
      .collect();

    const taskTemplates = await Promise.all(
      links.map(async (link) => {
        const template = await ctx.db.get(link.taskTemplateId);
        const fields = await ctx.db
          .query("fieldTemplates")
          .withIndex("by_task_template", (q) => q.eq("taskTemplateId", link.taskTemplateId))
          .collect();

        return {
          _id: link._id,
          taskTemplateId: link.taskTemplateId,
          taskTemplateName: template?.name ?? "Unknown",
          taskTemplateDescription: template?.description,
          order: link.order,
          isRequired: link.isRequired,
          fieldCount: fields.length,
        };
      })
    );

    return {
      day,
      taskTemplates: taskTemplates.sort((a, b) => a.order - b.order),
    };
  },
});

export const getWithDetails = query({
  args: { id: v.id("workOrderDays") },
  returns: v.union(
    v.object({
      day: workOrderDayValidator,
      workOrder: v.object({
        _id: v.id("workOrders"),
        name: v.string(),
        customerName: v.string(),
        faenaName: v.string(),
      }),
      assignments: v.array(
        v.object({
          _id: v.id("workOrderDayAssignments"),
          userId: v.id("users"),
          userFullName: v.optional(v.string()),
          userEmail: v.string(),
        })
      ),
      taskTemplates: v.array(
        v.object({
          _id: v.id("workOrderDayTaskTemplates"),
          taskTemplateId: v.id("taskTemplates"),
          taskTemplateName: v.string(),
          order: v.number(),
          isRequired: v.boolean(),
        })
      ),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const day = await ctx.db.get(args.id);
    if (!day) {
      return null;
    }

    const workOrder = await ctx.db.get(day.workOrderId);
    if (!workOrder) {
      return null;
    }

    const customer = await ctx.db.get(workOrder.customerId);
    const faena = await ctx.db.get(workOrder.faenaId);

    const assignmentDocs = await ctx.db
      .query("workOrderDayAssignments")
      .withIndex("by_work_order_day", (q) => q.eq("workOrderDayId", args.id))
      .collect();

    const assignments = await Promise.all(
      assignmentDocs.map(async (a) => {
        const user = await ctx.db.get(a.userId);
        return {
          _id: a._id,
          userId: a.userId,
          userFullName: user?.fullName,
          userEmail: user?.email ?? "Unknown",
        };
      })
    );

    const taskTemplateLinks = await ctx.db
      .query("workOrderDayTaskTemplates")
      .withIndex("by_work_order_day", (q) => q.eq("workOrderDayId", args.id))
      .collect();

    const taskTemplates = await Promise.all(
      taskTemplateLinks.map(async (link) => {
        const template = await ctx.db.get(link.taskTemplateId);
        return {
          _id: link._id,
          taskTemplateId: link.taskTemplateId,
          taskTemplateName: template?.name ?? "Unknown",
          order: link.order,
          isRequired: link.isRequired,
        };
      })
    );

    return {
      day,
      workOrder: {
        _id: workOrder._id,
        name: workOrder.name,
        customerName: customer?.name ?? "Unknown",
        faenaName: faena?.name ?? "Unknown",
      },
      assignments,
      taskTemplates: taskTemplates.sort((a, b) => a.order - b.order),
    };
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("workOrderDays"),
    status: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const validStatuses = ["pending", "in_progress", "completed"];
    if (!validStatuses.includes(args.status)) {
      throw new Error(`Invalid status. Must be one of: ${validStatuses.join(", ")}`);
    }

    await ctx.db.patch(args.id, {
      status: args.status,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const updateNotes = mutation({
  args: {
    id: v.id("workOrderDays"),
    notes: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      notes: args.notes,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const updateRequiredPeople = mutation({
  args: {
    id: v.id("workOrderDays"),
    requiredPeople: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (args.requiredPeople < 1) {
      throw new Error("Required people must be at least 1");
    }
    await ctx.db.patch(args.id, {
      requiredPeople: args.requiredPeople,
      updatedAt: Date.now(),
    });
    return null;
  },
});

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
      throw new Error("Task template already assigned to this day");
    }

    let order = args.order;
    if (order === undefined) {
      const existingLinks = await ctx.db
        .query("workOrderDayTaskTemplates")
        .withIndex("by_work_order_day", (q) => q.eq("workOrderDayId", args.workOrderDayId))
        .collect();
      order = existingLinks.length;
    }

    return await ctx.db.insert("workOrderDayTaskTemplates", {
      workOrderDayId: args.workOrderDayId,
      taskTemplateId: args.taskTemplateId,
      order,
      isRequired: args.isRequired ?? false,
    });
  },
});

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
      await ctx.db.delete(link._id);
    }

    return null;
  },
});

export const reorderTaskTemplates = mutation({
  args: {
    workOrderDayId: v.id("workOrderDays"),
    linkIds: v.array(v.id("workOrderDayTaskTemplates")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    for (let i = 0; i < args.linkIds.length; i++) {
      await ctx.db.patch(args.linkIds[i], { order: i });
    }
    return null;
  },
});
