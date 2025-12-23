import { query, mutation } from "../_generated/server";
import { v } from "convex/values";

const taskInstanceValidator = v.object({
  _id: v.id("taskInstances"),
  _creationTime: v.number(),
  clientId: v.string(),
  workOrderDayId: v.id("workOrderDays"),
  workOrderDayTaskTemplateId: v.id("workOrderDayTaskTemplates"),
  taskTemplateId: v.id("taskTemplates"),
  userId: v.string(),
  instanceLabel: v.optional(v.string()),
  status: v.string(),
  startedAt: v.optional(v.number()),
  completedAt: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
});

export const listByWorkOrderDay = query({
  args: { workOrderDayId: v.id("workOrderDays") },
  returns: v.array(
    v.object({
      _id: v.id("taskInstances"),
      clientId: v.string(),
      workOrderDayId: v.id("workOrderDays"),
      taskTemplateId: v.id("taskTemplates"),
      taskTemplateName: v.string(),
      userId: v.string(),
      instanceLabel: v.optional(v.string()),
      status: v.string(),
      startedAt: v.optional(v.number()),
      completedAt: v.optional(v.number()),
      createdAt: v.number(),
      updatedAt: v.number(),
      responseCount: v.number(),
      fieldCount: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const instances = await ctx.db
      .query("taskInstances")
      .withIndex("by_work_order_day", (q) => q.eq("workOrderDayId", args.workOrderDayId))
      .collect();

    return Promise.all(
      instances.map(async (instance) => {
        const template = await ctx.db.get(instance.taskTemplateId);

        const fields = await ctx.db
          .query("fieldTemplates")
          .withIndex("by_task_template", (q) => q.eq("taskTemplateId", instance.taskTemplateId))
          .collect();

        const responses = await ctx.db
          .query("fieldResponses")
          .withIndex("by_task_instance", (q) => q.eq("taskInstanceId", instance._id))
          .collect();

        return {
          _id: instance._id,
          clientId: instance.clientId,
          workOrderDayId: instance.workOrderDayId,
          taskTemplateId: instance.taskTemplateId,
          taskTemplateName: template?.name ?? "Unknown",
          userId: instance.userId,
          instanceLabel: instance.instanceLabel,
          status: instance.status,
          startedAt: instance.startedAt,
          completedAt: instance.completedAt,
          createdAt: instance.createdAt,
          updatedAt: instance.updatedAt,
          responseCount: responses.length,
          fieldCount: fields.length,
        };
      })
    );
  },
});

export const listByUser = query({
  args: { userId: v.string() },
  returns: v.array(taskInstanceValidator),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("taskInstances")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

export const listByDayAndUser = query({
  args: {
    workOrderDayId: v.id("workOrderDays"),
    userId: v.string(),
  },
  returns: v.array(
    v.object({
      _id: v.id("taskInstances"),
      clientId: v.string(),
      workOrderDayId: v.id("workOrderDays"),
      taskTemplateId: v.id("taskTemplates"),
      taskTemplateName: v.string(),
      userId: v.string(),
      instanceLabel: v.optional(v.string()),
      status: v.string(),
      startedAt: v.optional(v.number()),
      completedAt: v.optional(v.number()),
      createdAt: v.number(),
      updatedAt: v.number(),
      responseCount: v.number(),
      fieldCount: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const instances = await ctx.db
      .query("taskInstances")
      .withIndex("by_work_order_day_and_user", (q) =>
        q.eq("workOrderDayId", args.workOrderDayId).eq("userId", args.userId)
      )
      .collect();

    return Promise.all(
      instances.map(async (instance) => {
        const template = await ctx.db.get(instance.taskTemplateId);

        const fields = await ctx.db
          .query("fieldTemplates")
          .withIndex("by_task_template", (q) => q.eq("taskTemplateId", instance.taskTemplateId))
          .collect();

        const responses = await ctx.db
          .query("fieldResponses")
          .withIndex("by_task_instance", (q) => q.eq("taskInstanceId", instance._id))
          .collect();

        return {
          _id: instance._id,
          clientId: instance.clientId,
          workOrderDayId: instance.workOrderDayId,
          taskTemplateId: instance.taskTemplateId,
          taskTemplateName: template?.name ?? "Unknown",
          userId: instance.userId,
          instanceLabel: instance.instanceLabel,
          status: instance.status,
          startedAt: instance.startedAt,
          completedAt: instance.completedAt,
          createdAt: instance.createdAt,
          updatedAt: instance.updatedAt,
          responseCount: responses.length,
          fieldCount: fields.length,
        };
      })
    );
  },
});

export const get = query({
  args: { id: v.id("taskInstances") },
  returns: v.union(taskInstanceValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getByClientId = query({
  args: { clientId: v.string() },
  returns: v.union(taskInstanceValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("taskInstances")
      .withIndex("by_client_id", (q) => q.eq("clientId", args.clientId))
      .unique();
  },
});

export const getWithResponses = query({
  args: { id: v.id("taskInstances") },
  returns: v.union(
    v.object({
      instance: taskInstanceValidator,
      template: v.object({
        _id: v.id("taskTemplates"),
        name: v.string(),
        description: v.optional(v.string()),
      }),
      fields: v.array(
        v.object({
          _id: v.id("fieldTemplates"),
          label: v.string(),
          fieldType: v.string(),
          order: v.number(),
          isRequired: v.boolean(),
          defaultValue: v.optional(v.string()),
          placeholder: v.optional(v.string()),
          response: v.optional(
            v.object({
              _id: v.id("fieldResponses"),
              clientId: v.string(),
              value: v.optional(v.string()),
              updatedAt: v.number(),
            })
          ),
        })
      ),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const instance = await ctx.db.get(args.id);
    if (!instance) {
      return null;
    }

    const template = await ctx.db.get(instance.taskTemplateId);
    if (!template) {
      return null;
    }

    const fieldTemplates = await ctx.db
      .query("fieldTemplates")
      .withIndex("by_task_template", (q) => q.eq("taskTemplateId", instance.taskTemplateId))
      .collect();

    const responses = await ctx.db
      .query("fieldResponses")
      .withIndex("by_task_instance", (q) => q.eq("taskInstanceId", args.id))
      .collect();

    const responseMap = new Map(responses.map((r) => [r.fieldTemplateId.toString(), r]));

    const fields = fieldTemplates
      .sort((a, b) => a.order - b.order)
      .map((field) => {
        const response = responseMap.get(field._id.toString());
        return {
          _id: field._id,
          label: field.label,
          fieldType: field.fieldType,
          order: field.order,
          isRequired: field.isRequired,
          defaultValue: field.defaultValue,
          placeholder: field.placeholder,
          response: response
            ? {
                _id: response._id,
                clientId: response.clientId,
                value: response.value,
                updatedAt: response.updatedAt,
              }
            : undefined,
        };
      });

    return {
      instance,
      template: {
        _id: template._id,
        name: template.name,
        description: template.description,
      },
      fields,
    };
  },
});

export const create = mutation({
  args: {
    clientId: v.string(),
    workOrderDayId: v.id("workOrderDays"),
    workOrderDayTaskTemplateId: v.id("workOrderDayTaskTemplates"),
    taskTemplateId: v.id("taskTemplates"),
    userId: v.string(),
    instanceLabel: v.optional(v.string()),
  },
  returns: v.id("taskInstances"),
  handler: async (ctx, args) => {
    const day = await ctx.db.get(args.workOrderDayId);
    if (!day) {
      throw new Error("Work order day not found");
    }

    const dayTaskTemplate = await ctx.db.get(args.workOrderDayTaskTemplateId);
    if (!dayTaskTemplate) {
      throw new Error("Work order day task template not found");
    }

    const taskTemplate = await ctx.db.get(args.taskTemplateId);
    if (!taskTemplate) {
      throw new Error("Task template not found");
    }

    const existing = await ctx.db
      .query("taskInstances")
      .withIndex("by_client_id", (q) => q.eq("clientId", args.clientId))
      .unique();

    if (existing) {
      return existing._id;
    }

    const now = Date.now();

    return await ctx.db.insert("taskInstances", {
      clientId: args.clientId,
      workOrderDayId: args.workOrderDayId,
      workOrderDayTaskTemplateId: args.workOrderDayTaskTemplateId,
      taskTemplateId: args.taskTemplateId,
      userId: args.userId,
      instanceLabel: args.instanceLabel,
      status: "draft",
      startedAt: now,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("taskInstances"),
    instanceLabel: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();
    const updates: Record<string, string | number | undefined> = {
      updatedAt: now,
    };

    if (args.instanceLabel !== undefined) {
      updates.instanceLabel = args.instanceLabel;
    }

    if (args.status !== undefined) {
      const validStatuses = ["draft", "completed"];
      if (!validStatuses.includes(args.status)) {
        throw new Error(`Invalid status. Must be one of: ${validStatuses.join(", ")}`);
      }
      updates.status = args.status;
      if (args.status === "completed") {
        updates.completedAt = now;
      }
    }

    await ctx.db.patch(args.id, updates);
    return null;
  },
});

export const markComplete = mutation({
  args: { id: v.id("taskInstances") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const instance = await ctx.db.get(args.id);
    if (!instance) {
      throw new Error("Task instance not found");
    }

    const fieldTemplates = await ctx.db
      .query("fieldTemplates")
      .withIndex("by_task_template", (q) => q.eq("taskTemplateId", instance.taskTemplateId))
      .collect();

    const responses = await ctx.db
      .query("fieldResponses")
      .withIndex("by_task_instance", (q) => q.eq("taskInstanceId", args.id))
      .collect();

    const responseFieldIds = new Set(responses.map((r) => r.fieldTemplateId.toString()));

    const requiredFields = fieldTemplates.filter((f) => f.isRequired);
    for (const field of requiredFields) {
      if (!responseFieldIds.has(field._id.toString())) {
        throw new Error(`Required field "${field.label}" is not filled`);
      }
      const response = responses.find((r) => r.fieldTemplateId.toString() === field._id.toString());
      if (!response || response.value === undefined || response.value === "") {
        throw new Error(`Required field "${field.label}" is empty`);
      }
    }

    const now = Date.now();
    await ctx.db.patch(args.id, {
      status: "completed",
      completedAt: now,
      updatedAt: now,
    });

    return null;
  },
});
