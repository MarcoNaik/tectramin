import { query, mutation } from "../_generated/server";
import { v } from "convex/values";

const fieldResponseValidator = v.object({
  _id: v.id("fieldResponses"),
  _creationTime: v.number(),
  clientId: v.string(),
  taskInstanceId: v.id("taskInstances"),
  taskInstanceClientId: v.string(),
  fieldTemplateId: v.id("fieldTemplates"),
  value: v.optional(v.string()),
  userId: v.string(),
  createdAt: v.number(),
  updatedAt: v.number(),
});

export const listByTaskInstance = query({
  args: { taskInstanceId: v.id("taskInstances") },
  returns: v.array(
    v.object({
      _id: v.id("fieldResponses"),
      clientId: v.string(),
      taskInstanceId: v.id("taskInstances"),
      fieldTemplateId: v.id("fieldTemplates"),
      fieldLabel: v.string(),
      fieldType: v.string(),
      fieldOrder: v.number(),
      value: v.optional(v.string()),
      userId: v.string(),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const responses = await ctx.db
      .query("fieldResponses")
      .withIndex("by_task_instance", (q) => q.eq("taskInstanceId", args.taskInstanceId))
      .collect();

    return Promise.all(
      responses.map(async (response) => {
        const field = await ctx.db.get(response.fieldTemplateId);
        return {
          _id: response._id,
          clientId: response.clientId,
          taskInstanceId: response.taskInstanceId,
          fieldTemplateId: response.fieldTemplateId,
          fieldLabel: field?.label ?? "Unknown",
          fieldType: field?.fieldType ?? "text",
          fieldOrder: field?.order ?? 0,
          value: response.value,
          userId: response.userId,
          createdAt: response.createdAt,
          updatedAt: response.updatedAt,
        };
      })
    );
  },
});

export const get = query({
  args: { id: v.id("fieldResponses") },
  returns: v.union(fieldResponseValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getByClientId = query({
  args: { clientId: v.string() },
  returns: v.union(fieldResponseValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("fieldResponses")
      .withIndex("by_client_id", (q) => q.eq("clientId", args.clientId))
      .unique();
  },
});

export const upsert = mutation({
  args: {
    clientId: v.string(),
    taskInstanceId: v.id("taskInstances"),
    taskInstanceClientId: v.string(),
    fieldTemplateId: v.id("fieldTemplates"),
    value: v.optional(v.string()),
    userId: v.string(),
  },
  returns: v.id("fieldResponses"),
  handler: async (ctx, args) => {
    const taskInstance = await ctx.db.get(args.taskInstanceId);
    if (!taskInstance) {
      throw new Error("Task instance not found");
    }

    const fieldTemplate = await ctx.db.get(args.fieldTemplateId);
    if (!fieldTemplate) {
      throw new Error("Field template not found");
    }

    const existing = await ctx.db
      .query("fieldResponses")
      .withIndex("by_client_id", (q) => q.eq("clientId", args.clientId))
      .unique();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        value: args.value,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("fieldResponses", {
      clientId: args.clientId,
      taskInstanceId: args.taskInstanceId,
      taskInstanceClientId: args.taskInstanceClientId,
      fieldTemplateId: args.fieldTemplateId,
      value: args.value,
      userId: args.userId,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const bulkUpsert = mutation({
  args: {
    responses: v.array(
      v.object({
        clientId: v.string(),
        taskInstanceId: v.id("taskInstances"),
        taskInstanceClientId: v.string(),
        fieldTemplateId: v.id("fieldTemplates"),
        value: v.optional(v.string()),
        userId: v.string(),
      })
    ),
  },
  returns: v.array(v.id("fieldResponses")),
  handler: async (ctx, args) => {
    const ids = [];
    const now = Date.now();

    for (const response of args.responses) {
      const existing = await ctx.db
        .query("fieldResponses")
        .withIndex("by_client_id", (q) => q.eq("clientId", response.clientId))
        .unique();

      if (existing) {
        await ctx.db.patch(existing._id, {
          value: response.value,
          updatedAt: now,
        });
        ids.push(existing._id);
      } else {
        const id = await ctx.db.insert("fieldResponses", {
          clientId: response.clientId,
          taskInstanceId: response.taskInstanceId,
          taskInstanceClientId: response.taskInstanceClientId,
          fieldTemplateId: response.fieldTemplateId,
          value: response.value,
          userId: response.userId,
          createdAt: now,
          updatedAt: now,
        });
        ids.push(id);
      }
    }

    return ids;
  },
});

export const update = mutation({
  args: {
    id: v.id("fieldResponses"),
    value: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      value: args.value,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const remove = mutation({
  args: { id: v.id("fieldResponses") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return null;
  },
});
