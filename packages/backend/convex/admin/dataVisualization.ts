import { query } from "../_generated/server";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";

export const getFilterOptions = query({
  args: {},
  returns: v.object({
    faenas: v.array(v.object({ _id: v.id("faenas"), name: v.string() })),
    users: v.array(
      v.object({ _id: v.id("users"), name: v.string(), clerkId: v.string() })
    ),
    taskTemplates: v.array(
      v.object({ _id: v.id("taskTemplates"), name: v.string() })
    ),
    workOrders: v.array(
      v.object({
        _id: v.id("workOrders"),
        name: v.string(),
        faenaId: v.id("faenas"),
      })
    ),
  }),
  handler: async (ctx) => {
    const faenas = await ctx.db.query("faenas").collect();
    const users = await ctx.db.query("users").collect();
    const taskTemplates = await ctx.db.query("taskTemplates").collect();
    const workOrders = await ctx.db.query("workOrders").collect();

    return {
      faenas: faenas.map((f) => ({ _id: f._id, name: f.name })),
      users: users.map((u) => ({
        _id: u._id,
        name: u.fullName ?? u.email,
        clerkId: u.clerkId,
      })),
      taskTemplates: taskTemplates.map((t) => ({ _id: t._id, name: t.name })),
      workOrders: workOrders.map((w) => ({
        _id: w._id,
        name: w.name,
        faenaId: w.faenaId,
      })),
    };
  },
});

export const listAllResponses = query({
  args: {
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    faenaId: v.optional(v.id("faenas")),
    userId: v.optional(v.string()),
    workOrderId: v.optional(v.id("workOrders")),
    taskTemplateId: v.optional(v.id("taskTemplates")),
    status: v.optional(v.string()),
  },
  returns: v.array(
    v.object({
      responseId: v.id("fieldResponses"),
      taskInstanceId: v.id("taskInstances"),
      faenaId: v.id("faenas"),
      faenaName: v.string(),
      workOrderId: v.id("workOrders"),
      workOrderName: v.string(),
      workOrderDayId: v.id("workOrderDays"),
      dayDate: v.number(),
      dayNumber: v.number(),
      taskTemplateId: v.id("taskTemplates"),
      taskTemplateName: v.string(),
      taskStatus: v.string(),
      userId: v.string(),
      userName: v.string(),
      fieldTemplateId: v.id("fieldTemplates"),
      fieldLabel: v.string(),
      fieldType: v.string(),
      fieldOrder: v.number(),
      isRequired: v.boolean(),
      displayStyle: v.optional(v.string()),
      value: v.optional(v.string()),
      attachmentUrl: v.optional(v.string()),
      responseUpdatedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    let taskInstances = await ctx.db.query("taskInstances").collect();

    if (args.userId) {
      taskInstances = taskInstances.filter((t) => t.userId === args.userId);
    }
    if (args.taskTemplateId) {
      taskInstances = taskInstances.filter(
        (t) => t.taskTemplateId === args.taskTemplateId
      );
    }
    if (args.status) {
      taskInstances = taskInstances.filter((t) => t.status === args.status);
    }

    const results: Array<{
      responseId: Id<"fieldResponses">;
      taskInstanceId: Id<"taskInstances">;
      faenaId: Id<"faenas">;
      faenaName: string;
      workOrderId: Id<"workOrders">;
      workOrderName: string;
      workOrderDayId: Id<"workOrderDays">;
      dayDate: number;
      dayNumber: number;
      taskTemplateId: Id<"taskTemplates">;
      taskTemplateName: string;
      taskStatus: string;
      userId: string;
      userName: string;
      fieldTemplateId: Id<"fieldTemplates">;
      fieldLabel: string;
      fieldType: string;
      fieldOrder: number;
      isRequired: boolean;
      displayStyle: string | undefined;
      value: string | undefined;
      attachmentUrl: string | undefined;
      responseUpdatedAt: number;
    }> = [];

    for (const task of taskInstances) {
      const workOrderDay = await ctx.db.get(task.workOrderDayId);
      if (!workOrderDay) continue;

      if (args.startDate !== undefined && workOrderDay.dayDate < args.startDate)
        continue;
      if (args.endDate !== undefined && workOrderDay.dayDate > args.endDate)
        continue;

      const workOrder = await ctx.db.get(workOrderDay.workOrderId);
      if (!workOrder) continue;

      if (args.workOrderId && workOrder._id !== args.workOrderId) continue;

      const faena = await ctx.db.get(workOrder.faenaId);
      if (!faena) continue;

      if (args.faenaId && faena._id !== args.faenaId) continue;

      const taskTemplate = await ctx.db.get(task.taskTemplateId);
      if (!taskTemplate) continue;

      const users = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("clerkId", task.userId))
        .collect();
      const userName = users[0]?.fullName ?? users[0]?.email ?? task.userId;

      const responses = await ctx.db
        .query("fieldResponses")
        .withIndex("by_task_instance", (q) => q.eq("taskInstanceId", task._id))
        .collect();

      for (const response of responses) {
        const fieldTemplate = await ctx.db.get(response.fieldTemplateId);
        if (!fieldTemplate) continue;

        let attachmentUrl: string | undefined;
        if (fieldTemplate.fieldType === "attachment" && response.value) {
          const attachments = await ctx.db
            .query("attachments")
            .withIndex("by_client_id", (q) => q.eq("clientId", response.value!))
            .collect();
          if (attachments[0]?.storageId) {
            attachmentUrl =
              (await ctx.storage.getUrl(attachments[0].storageId)) ?? undefined;
          }
        }

        results.push({
          responseId: response._id,
          taskInstanceId: task._id,
          faenaId: faena._id,
          faenaName: faena.name,
          workOrderId: workOrder._id,
          workOrderName: workOrder.name,
          workOrderDayId: workOrderDay._id,
          dayDate: workOrderDay.dayDate,
          dayNumber: workOrderDay.dayNumber,
          taskTemplateId: taskTemplate._id,
          taskTemplateName: taskTemplate.name,
          taskStatus: task.status,
          userId: task.userId,
          userName,
          fieldTemplateId: fieldTemplate._id,
          fieldLabel: fieldTemplate.label,
          fieldType: fieldTemplate.fieldType,
          fieldOrder: fieldTemplate.order,
          isRequired: fieldTemplate.isRequired,
          displayStyle: fieldTemplate.displayStyle,
          value: response.value,
          attachmentUrl,
          responseUpdatedAt: response.updatedAt,
        });
      }
    }

    results.sort((a, b) => b.responseUpdatedAt - a.responseUpdatedAt);

    return results;
  },
});
