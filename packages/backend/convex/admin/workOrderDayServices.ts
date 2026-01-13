import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { createInstancesForRoutineOnDay } from "../shared/taskInstanceCreation";

const workOrderDayServiceValidator = v.object({
  _id: v.id("workOrderDayServices"),
  _creationTime: v.number(),
  workOrderDayId: v.id("workOrderDays"),
  serviceId: v.id("services"),
  order: v.number(),
  createdAt: v.number(),
});

export const listByDay = query({
  args: { workOrderDayId: v.id("workOrderDays") },
  returns: v.array(
    v.object({
      _id: v.id("workOrderDayServices"),
      workOrderDayId: v.id("workOrderDays"),
      serviceId: v.id("services"),
      serviceName: v.string(),
      order: v.number(),
      createdAt: v.number(),
      taskCount: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const links = await ctx.db
      .query("workOrderDayServices")
      .withIndex("by_work_order_day", (q) => q.eq("workOrderDayId", args.workOrderDayId))
      .filter((q) => q.neq(q.field("isActive"), false))
      .collect();

    const result = await Promise.all(
      links.map(async (link) => {
        const service = await ctx.db.get(link.serviceId);
        const day = await ctx.db.get(link.workOrderDayId);
        const taskTemplates = await ctx.db
          .query("serviceTaskTemplates")
          .withIndex("by_service", (q) => q.eq("serviceId", link.serviceId))
          .filter((q) => q.neq(q.field("isActive"), false))
          .collect();
        const applicableTasks = taskTemplates.filter(
          (t) => t.dayNumber === undefined || t.dayNumber === day?.dayNumber
        );
        return {
          _id: link._id,
          workOrderDayId: link.workOrderDayId,
          serviceId: link.serviceId,
          serviceName: service?.name ?? "Unknown",
          order: link.order,
          createdAt: link.createdAt,
          taskCount: applicableTasks.length,
        };
      })
    );

    return result.sort((a, b) => a.order - b.order);
  },
});

export const listByService = query({
  args: { serviceId: v.id("services") },
  returns: v.array(workOrderDayServiceValidator),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("workOrderDayServices")
      .withIndex("by_service", (q) => q.eq("serviceId", args.serviceId))
      .collect();
  },
});

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

      await createInstancesForRoutineOnDay(
        ctx,
        args.workOrderDayId,
        existing._id,
        args.serviceId
      );

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

    const newId = await ctx.db.insert("workOrderDayServices", {
      workOrderDayId: args.workOrderDayId,
      serviceId: args.serviceId,
      order,
      createdAt: Date.now(),
      isActive: true,
    });

    await createInstancesForRoutineOnDay(
      ctx,
      args.workOrderDayId,
      newId,
      args.serviceId
    );

    return newId;
  },
});

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

export const reorderServices = mutation({
  args: {
    workOrderDayId: v.id("workOrderDays"),
    orderedServiceIds: v.array(v.id("workOrderDayServices")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    for (let i = 0; i < args.orderedServiceIds.length; i++) {
      await ctx.db.patch(args.orderedServiceIds[i], { order: i });
    }
    return null;
  },
});

export const getServicesWithTasks = query({
  args: { workOrderDayId: v.id("workOrderDays") },
  returns: v.array(
    v.object({
      workOrderDayServiceId: v.id("workOrderDayServices"),
      serviceId: v.id("services"),
      serviceName: v.string(),
      order: v.number(),
      tasks: v.array(
        v.object({
          serviceTaskTemplateId: v.id("serviceTaskTemplates"),
          taskTemplateId: v.id("taskTemplates"),
          taskTemplateName: v.string(),
          description: v.optional(v.string()),
          order: v.number(),
          isRequired: v.boolean(),
          isRepeatable: v.boolean(),
        })
      ),
    })
  ),
  handler: async (ctx, args) => {
    const day = await ctx.db.get(args.workOrderDayId);
    if (!day) {
      return [];
    }

    const links = await ctx.db
      .query("workOrderDayServices")
      .withIndex("by_work_order_day", (q) => q.eq("workOrderDayId", args.workOrderDayId))
      .filter((q) => q.neq(q.field("isActive"), false))
      .collect();

    const result = await Promise.all(
      links.map(async (link) => {
        const service = await ctx.db.get(link.serviceId);

        const serviceTaskTemplates = await ctx.db
          .query("serviceTaskTemplates")
          .withIndex("by_service", (q) => q.eq("serviceId", link.serviceId))
          .filter((q) => q.neq(q.field("isActive"), false))
          .collect();

        const applicableTasks = serviceTaskTemplates.filter(
          (t) => t.dayNumber === undefined || t.dayNumber === day.dayNumber
        );

        const tasks = await Promise.all(
          applicableTasks.map(async (stt) => {
            const template = await ctx.db.get(stt.taskTemplateId);
            return {
              serviceTaskTemplateId: stt._id,
              taskTemplateId: stt.taskTemplateId,
              taskTemplateName: template?.name ?? "Unknown",
              description: template?.description,
              order: stt.order,
              isRequired: stt.isRequired,
              isRepeatable: template?.isRepeatable ?? false,
            };
          })
        );

        return {
          workOrderDayServiceId: link._id,
          serviceId: link.serviceId,
          serviceName: service?.name ?? "Unknown",
          order: link.order,
          tasks: tasks.sort((a, b) => a.order - b.order),
        };
      })
    );

    return result.sort((a, b) => a.order - b.order);
  },
});
