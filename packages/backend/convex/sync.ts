import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const upsertTaskInstance = mutation({
  args: {
    clientId: v.string(),
    workOrderDayServerId: v.string(),
    dayTaskTemplateServerId: v.string(),
    taskTemplateServerId: v.string(),
    userId: v.string(),
    instanceLabel: v.optional(v.string()),
    status: v.string(),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  },
  returns: v.object({
    serverId: v.string(),
  }),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("taskInstances")
      .withIndex("by_client_id", (q) => q.eq("clientId", args.clientId))
      .unique();

    const workOrderDayId = args.workOrderDayServerId as unknown as ReturnType<
      typeof v.id<"workOrderDays">
    >["type"];
    const workOrderDayTaskTemplateId = args.dayTaskTemplateServerId as unknown as ReturnType<
      typeof v.id<"workOrderDayTaskTemplates">
    >["type"];
    const taskTemplateId = args.taskTemplateServerId as unknown as ReturnType<
      typeof v.id<"taskTemplates">
    >["type"];

    if (existing) {
      await ctx.db.patch(existing._id, {
        instanceLabel: args.instanceLabel,
        status: args.status,
        startedAt: args.startedAt,
        completedAt: args.completedAt,
        updatedAt: args.updatedAt,
      });
      return { serverId: existing._id };
    }

    const id = await ctx.db.insert("taskInstances", {
      clientId: args.clientId,
      workOrderDayId,
      workOrderDayTaskTemplateId,
      taskTemplateId,
      userId: args.userId,
      instanceLabel: args.instanceLabel,
      status: args.status,
      startedAt: args.startedAt,
      completedAt: args.completedAt,
      createdAt: args.createdAt,
      updatedAt: args.updatedAt,
    });
    return { serverId: id };
  },
});

export const upsertFieldResponse = mutation({
  args: {
    clientId: v.string(),
    taskInstanceServerId: v.optional(v.string()),
    taskInstanceClientId: v.string(),
    fieldTemplateServerId: v.string(),
    value: v.optional(v.string()),
    userId: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  },
  returns: v.object({
    serverId: v.string(),
  }),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("fieldResponses")
      .withIndex("by_client_id", (q) => q.eq("clientId", args.clientId))
      .unique();

    const fieldTemplateId = args.fieldTemplateServerId as unknown as ReturnType<
      typeof v.id<"fieldTemplates">
    >["type"];

    if (existing) {
      await ctx.db.patch(existing._id, {
        value: args.value,
        updatedAt: args.updatedAt,
      });
      return { serverId: existing._id };
    }

    let taskInstanceId;
    if (args.taskInstanceServerId) {
      taskInstanceId = args.taskInstanceServerId as unknown as ReturnType<
        typeof v.id<"taskInstances">
      >["type"];
    } else {
      const taskInstance = await ctx.db
        .query("taskInstances")
        .withIndex("by_client_id", (q) => q.eq("clientId", args.taskInstanceClientId))
        .unique();

      if (!taskInstance) {
        throw new Error("Task instance not found for clientId: " + args.taskInstanceClientId);
      }
      taskInstanceId = taskInstance._id;
    }

    const id = await ctx.db.insert("fieldResponses", {
      clientId: args.clientId,
      taskInstanceId,
      taskInstanceClientId: args.taskInstanceClientId,
      fieldTemplateId,
      value: args.value,
      userId: args.userId,
      createdAt: args.createdAt,
      updatedAt: args.updatedAt,
    });
    return { serverId: id };
  },
});

export const batchSync = mutation({
  args: {
    taskInstances: v.array(
      v.object({
        clientId: v.string(),
        workOrderDayServerId: v.string(),
        dayTaskTemplateServerId: v.string(),
        taskTemplateServerId: v.string(),
        userId: v.string(),
        instanceLabel: v.optional(v.string()),
        status: v.string(),
        startedAt: v.optional(v.number()),
        completedAt: v.optional(v.number()),
        createdAt: v.number(),
        updatedAt: v.number(),
      })
    ),
    fieldResponses: v.array(
      v.object({
        clientId: v.string(),
        taskInstanceClientId: v.string(),
        fieldTemplateServerId: v.string(),
        value: v.optional(v.string()),
        userId: v.string(),
        createdAt: v.number(),
        updatedAt: v.number(),
      })
    ),
  },
  returns: v.object({
    taskInstanceResults: v.array(
      v.object({
        clientId: v.string(),
        serverId: v.string(),
      })
    ),
    fieldResponseResults: v.array(
      v.object({
        clientId: v.string(),
        serverId: v.string(),
      })
    ),
  }),
  handler: async (ctx, args) => {
    const taskInstanceResults = [];

    for (const ti of args.taskInstances) {
      const existing = await ctx.db
        .query("taskInstances")
        .withIndex("by_client_id", (q) => q.eq("clientId", ti.clientId))
        .unique();

      const workOrderDayId = ti.workOrderDayServerId as unknown as ReturnType<
        typeof v.id<"workOrderDays">
      >["type"];
      const workOrderDayTaskTemplateId = ti.dayTaskTemplateServerId as unknown as ReturnType<
        typeof v.id<"workOrderDayTaskTemplates">
      >["type"];
      const taskTemplateId = ti.taskTemplateServerId as unknown as ReturnType<
        typeof v.id<"taskTemplates">
      >["type"];

      if (existing) {
        await ctx.db.patch(existing._id, {
          instanceLabel: ti.instanceLabel,
          status: ti.status,
          startedAt: ti.startedAt,
          completedAt: ti.completedAt,
          updatedAt: ti.updatedAt,
        });
        taskInstanceResults.push({ clientId: ti.clientId, serverId: existing._id });
      } else {
        const id = await ctx.db.insert("taskInstances", {
          clientId: ti.clientId,
          workOrderDayId,
          workOrderDayTaskTemplateId,
          taskTemplateId,
          userId: ti.userId,
          instanceLabel: ti.instanceLabel,
          status: ti.status,
          startedAt: ti.startedAt,
          completedAt: ti.completedAt,
          createdAt: ti.createdAt,
          updatedAt: ti.updatedAt,
        });
        taskInstanceResults.push({ clientId: ti.clientId, serverId: id });
      }
    }

    const fieldResponseResults = [];

    for (const fr of args.fieldResponses) {
      const existing = await ctx.db
        .query("fieldResponses")
        .withIndex("by_client_id", (q) => q.eq("clientId", fr.clientId))
        .unique();

      const fieldTemplateId = fr.fieldTemplateServerId as unknown as ReturnType<
        typeof v.id<"fieldTemplates">
      >["type"];

      if (existing) {
        await ctx.db.patch(existing._id, {
          value: fr.value,
          updatedAt: fr.updatedAt,
        });
        fieldResponseResults.push({ clientId: fr.clientId, serverId: existing._id });
      } else {
        const taskInstance = await ctx.db
          .query("taskInstances")
          .withIndex("by_client_id", (q) => q.eq("clientId", fr.taskInstanceClientId))
          .unique();

        if (!taskInstance) {
          throw new Error("Task instance not found for clientId: " + fr.taskInstanceClientId);
        }

        const id = await ctx.db.insert("fieldResponses", {
          clientId: fr.clientId,
          taskInstanceId: taskInstance._id,
          taskInstanceClientId: fr.taskInstanceClientId,
          fieldTemplateId,
          value: fr.value,
          userId: fr.userId,
          createdAt: fr.createdAt,
          updatedAt: fr.updatedAt,
        });
        fieldResponseResults.push({ clientId: fr.clientId, serverId: id });
      }
    }

    return { taskInstanceResults, fieldResponseResults };
  },
});

export const getAssignmentsForUser = query({
  args: { clerkUserId: v.string() },
  returns: v.array(
    v.object({
      workOrderDayServerId: v.string(),
      workOrderServerId: v.string(),
      workOrderName: v.string(),
      customerName: v.string(),
      faenaName: v.string(),
      dayDate: v.number(),
      dayNumber: v.number(),
      status: v.string(),
      taskTemplates: v.array(
        v.object({
          dayTaskTemplateServerId: v.string(),
          taskTemplateServerId: v.string(),
          taskTemplateName: v.string(),
          order: v.number(),
          isRequired: v.boolean(),
          fields: v.array(
            v.object({
              fieldTemplateServerId: v.string(),
              label: v.string(),
              fieldType: v.string(),
              order: v.number(),
              isRequired: v.boolean(),
              defaultValue: v.optional(v.string()),
              placeholder: v.optional(v.string()),
            })
          ),
        })
      ),
    })
  ),
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkUserId))
      .unique();

    if (!user) {
      return [];
    }

    const assignments = await ctx.db
      .query("workOrderDayAssignments")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const results = await Promise.all(
      assignments.map(async (assignment) => {
        const day = await ctx.db.get(assignment.workOrderDayId);
        if (!day) return null;

        const workOrder = await ctx.db.get(day.workOrderId);
        if (!workOrder) return null;

        const customer = await ctx.db.get(workOrder.customerId);
        const faena = await ctx.db.get(workOrder.faenaId);

        const dayTaskTemplates = await ctx.db
          .query("workOrderDayTaskTemplates")
          .withIndex("by_work_order_day", (q) => q.eq("workOrderDayId", day._id))
          .collect();

        const taskTemplates = await Promise.all(
          dayTaskTemplates.map(async (dtt) => {
            const template = await ctx.db.get(dtt.taskTemplateId);

            const fieldTemplates = await ctx.db
              .query("fieldTemplates")
              .withIndex("by_task_template", (q) => q.eq("taskTemplateId", dtt.taskTemplateId))
              .collect();

            return {
              dayTaskTemplateServerId: dtt._id,
              taskTemplateServerId: dtt.taskTemplateId,
              taskTemplateName: template?.name ?? "Unknown",
              order: dtt.order,
              isRequired: dtt.isRequired,
              fields: fieldTemplates
                .sort((a, b) => a.order - b.order)
                .map((f) => ({
                  fieldTemplateServerId: f._id,
                  label: f.label,
                  fieldType: f.fieldType,
                  order: f.order,
                  isRequired: f.isRequired,
                  defaultValue: f.defaultValue,
                  placeholder: f.placeholder,
                })),
            };
          })
        );

        return {
          workOrderDayServerId: day._id,
          workOrderServerId: workOrder._id,
          workOrderName: workOrder.name,
          customerName: customer?.name ?? "Unknown",
          faenaName: faena?.name ?? "Unknown",
          dayDate: day.dayDate,
          dayNumber: day.dayNumber,
          status: day.status,
          taskTemplates: taskTemplates.sort((a, b) => a.order - b.order),
        };
      })
    );

    return results.filter((r): r is NonNullable<typeof r> => r !== null);
  },
});

export const getTaskInstancesSince = query({
  args: {
    userId: v.string(),
    since: v.number(),
  },
  returns: v.array(
    v.object({
      serverId: v.string(),
      clientId: v.string(),
      workOrderDayServerId: v.string(),
      dayTaskTemplateServerId: v.string(),
      taskTemplateServerId: v.string(),
      userId: v.string(),
      instanceLabel: v.optional(v.string()),
      status: v.string(),
      startedAt: v.optional(v.number()),
      completedAt: v.optional(v.number()),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const instances = await ctx.db
      .query("taskInstances")
      .withIndex("by_user_and_updated", (q) =>
        q.eq("userId", args.userId).gt("updatedAt", args.since)
      )
      .collect();

    return instances.map((i) => ({
      serverId: i._id,
      clientId: i.clientId,
      workOrderDayServerId: i.workOrderDayId,
      dayTaskTemplateServerId: i.workOrderDayTaskTemplateId,
      taskTemplateServerId: i.taskTemplateId,
      userId: i.userId,
      instanceLabel: i.instanceLabel,
      status: i.status,
      startedAt: i.startedAt,
      completedAt: i.completedAt,
      createdAt: i.createdAt,
      updatedAt: i.updatedAt,
    }));
  },
});

export const getFieldResponsesSince = query({
  args: {
    userId: v.string(),
    since: v.number(),
  },
  returns: v.array(
    v.object({
      serverId: v.string(),
      clientId: v.string(),
      taskInstanceServerId: v.string(),
      taskInstanceClientId: v.string(),
      fieldTemplateServerId: v.string(),
      value: v.optional(v.string()),
      userId: v.string(),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const responses = await ctx.db
      .query("fieldResponses")
      .withIndex("by_user_and_updated", (q) =>
        q.eq("userId", args.userId).gt("updatedAt", args.since)
      )
      .collect();

    return responses.map((r) => ({
      serverId: r._id,
      clientId: r.clientId,
      taskInstanceServerId: r.taskInstanceId,
      taskInstanceClientId: r.taskInstanceClientId,
      fieldTemplateServerId: r.fieldTemplateId,
      value: r.value,
      userId: r.userId,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  },
});

export const getInitialSyncData = query({
  args: { clerkUserId: v.string() },
  returns: v.object({
    assignments: v.array(
      v.object({
        workOrderDayServerId: v.string(),
        workOrderServerId: v.string(),
        workOrderName: v.string(),
        customerName: v.string(),
        faenaName: v.string(),
        dayDate: v.number(),
        dayNumber: v.number(),
        status: v.string(),
        taskTemplates: v.array(
          v.object({
            dayTaskTemplateServerId: v.string(),
            taskTemplateServerId: v.string(),
            taskTemplateName: v.string(),
            order: v.number(),
            isRequired: v.boolean(),
            fields: v.array(
              v.object({
                fieldTemplateServerId: v.string(),
                label: v.string(),
                fieldType: v.string(),
                order: v.number(),
                isRequired: v.boolean(),
                defaultValue: v.optional(v.string()),
                placeholder: v.optional(v.string()),
              })
            ),
          })
        ),
      })
    ),
    taskInstances: v.array(
      v.object({
        serverId: v.string(),
        clientId: v.string(),
        workOrderDayServerId: v.string(),
        dayTaskTemplateServerId: v.string(),
        taskTemplateServerId: v.string(),
        userId: v.string(),
        instanceLabel: v.optional(v.string()),
        status: v.string(),
        startedAt: v.optional(v.number()),
        completedAt: v.optional(v.number()),
        createdAt: v.number(),
        updatedAt: v.number(),
      })
    ),
    fieldResponses: v.array(
      v.object({
        serverId: v.string(),
        clientId: v.string(),
        taskInstanceServerId: v.string(),
        taskInstanceClientId: v.string(),
        fieldTemplateServerId: v.string(),
        value: v.optional(v.string()),
        userId: v.string(),
        createdAt: v.number(),
        updatedAt: v.number(),
      })
    ),
  }),
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkUserId))
      .unique();

    if (!user) {
      return { assignments: [], taskInstances: [], fieldResponses: [] };
    }

    const assignmentDocs = await ctx.db
      .query("workOrderDayAssignments")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const assignments = await Promise.all(
      assignmentDocs.map(async (assignment) => {
        const day = await ctx.db.get(assignment.workOrderDayId);
        if (!day) return null;

        const workOrder = await ctx.db.get(day.workOrderId);
        if (!workOrder) return null;

        const customer = await ctx.db.get(workOrder.customerId);
        const faena = await ctx.db.get(workOrder.faenaId);

        const dayTaskTemplates = await ctx.db
          .query("workOrderDayTaskTemplates")
          .withIndex("by_work_order_day", (q) => q.eq("workOrderDayId", day._id))
          .collect();

        const taskTemplates = await Promise.all(
          dayTaskTemplates.map(async (dtt) => {
            const template = await ctx.db.get(dtt.taskTemplateId);

            const fieldTemplates = await ctx.db
              .query("fieldTemplates")
              .withIndex("by_task_template", (q) => q.eq("taskTemplateId", dtt.taskTemplateId))
              .collect();

            return {
              dayTaskTemplateServerId: dtt._id as string,
              taskTemplateServerId: dtt.taskTemplateId as string,
              taskTemplateName: template?.name ?? "Unknown",
              order: dtt.order,
              isRequired: dtt.isRequired,
              fields: fieldTemplates
                .sort((a, b) => a.order - b.order)
                .map((f) => ({
                  fieldTemplateServerId: f._id as string,
                  label: f.label,
                  fieldType: f.fieldType,
                  order: f.order,
                  isRequired: f.isRequired,
                  defaultValue: f.defaultValue,
                  placeholder: f.placeholder,
                })),
            };
          })
        );

        return {
          workOrderDayServerId: day._id as string,
          workOrderServerId: workOrder._id as string,
          workOrderName: workOrder.name,
          customerName: customer?.name ?? "Unknown",
          faenaName: faena?.name ?? "Unknown",
          dayDate: day.dayDate,
          dayNumber: day.dayNumber,
          status: day.status,
          taskTemplates: taskTemplates.sort((a, b) => a.order - b.order),
        };
      })
    );

    const taskInstanceDocs = await ctx.db
      .query("taskInstances")
      .withIndex("by_user", (q) => q.eq("userId", args.clerkUserId))
      .collect();

    const taskInstances = taskInstanceDocs.map((i) => ({
      serverId: i._id as string,
      clientId: i.clientId,
      workOrderDayServerId: i.workOrderDayId as string,
      dayTaskTemplateServerId: i.workOrderDayTaskTemplateId as string,
      taskTemplateServerId: i.taskTemplateId as string,
      userId: i.userId,
      instanceLabel: i.instanceLabel,
      status: i.status,
      startedAt: i.startedAt,
      completedAt: i.completedAt,
      createdAt: i.createdAt,
      updatedAt: i.updatedAt,
    }));

    const fieldResponseDocs = await ctx.db
      .query("fieldResponses")
      .withIndex("by_user_and_updated", (q) => q.eq("userId", args.clerkUserId))
      .collect();

    const fieldResponses = fieldResponseDocs.map((r) => ({
      serverId: r._id as string,
      clientId: r.clientId,
      taskInstanceServerId: r.taskInstanceId as string,
      taskInstanceClientId: r.taskInstanceClientId,
      fieldTemplateServerId: r.fieldTemplateId as string,
      value: r.value,
      userId: r.userId,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));

    return {
      assignments: assignments.filter((a): a is NonNullable<typeof a> => a !== null),
      taskInstances,
      fieldResponses,
    };
  },
});
