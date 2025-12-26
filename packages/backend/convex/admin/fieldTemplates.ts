import { query, mutation } from "../_generated/server";
import { v } from "convex/values";

const fieldTemplateValidator = v.object({
  _id: v.id("fieldTemplates"),
  _creationTime: v.number(),
  taskTemplateId: v.id("taskTemplates"),
  label: v.string(),
  fieldType: v.string(),
  order: v.number(),
  isRequired: v.boolean(),
  defaultValue: v.optional(v.string()),
  placeholder: v.optional(v.string()),
  subheader: v.optional(v.string()),
  displayStyle: v.optional(v.string()),
  conditionLogic: v.optional(v.union(v.literal("AND"), v.literal("OR"), v.null())),
  createdAt: v.number(),
});

export const listByTaskTemplate = query({
  args: { taskTemplateId: v.id("taskTemplates") },
  returns: v.array(fieldTemplateValidator),
  handler: async (ctx, args) => {
    const fields = await ctx.db
      .query("fieldTemplates")
      .withIndex("by_task_template", (q) =>
        q.eq("taskTemplateId", args.taskTemplateId)
      )
      .collect();
    return fields.sort((a, b) => a.order - b.order);
  },
});

export const get = query({
  args: { id: v.id("fieldTemplates") },
  returns: v.union(fieldTemplateValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    taskTemplateId: v.id("taskTemplates"),
    label: v.string(),
    fieldType: v.string(),
    order: v.optional(v.number()),
    isRequired: v.optional(v.boolean()),
    defaultValue: v.optional(v.string()),
    placeholder: v.optional(v.string()),
    subheader: v.optional(v.string()),
    displayStyle: v.optional(v.string()),
    conditionLogic: v.optional(v.union(v.literal("AND"), v.literal("OR"))),
  },
  returns: v.id("fieldTemplates"),
  handler: async (ctx, args) => {
    const taskTemplate = await ctx.db.get(args.taskTemplateId);
    if (!taskTemplate) {
      throw new Error("Task template not found");
    }

    const validFieldTypes = ["text", "number", "boolean", "date", "attachment", "displayText", "select", "userSelect"];
    if (!validFieldTypes.includes(args.fieldType)) {
      throw new Error(`Invalid field type. Must be one of: ${validFieldTypes.join(", ")}`);
    }

    let order = args.order;
    if (order === undefined) {
      const existingFields = await ctx.db
        .query("fieldTemplates")
        .withIndex("by_task_template", (q) =>
          q.eq("taskTemplateId", args.taskTemplateId)
        )
        .collect();
      order = existingFields.length;
    }

    return await ctx.db.insert("fieldTemplates", {
      taskTemplateId: args.taskTemplateId,
      label: args.label,
      fieldType: args.fieldType,
      order,
      isRequired: args.isRequired ?? false,
      defaultValue: args.defaultValue,
      placeholder: args.placeholder,
      subheader: args.subheader,
      displayStyle: args.displayStyle,
      conditionLogic: args.conditionLogic,
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("fieldTemplates"),
    label: v.optional(v.string()),
    fieldType: v.optional(v.string()),
    isRequired: v.optional(v.boolean()),
    defaultValue: v.optional(v.string()),
    placeholder: v.optional(v.string()),
    subheader: v.optional(v.string()),
    displayStyle: v.optional(v.string()),
    conditionLogic: v.optional(v.union(v.literal("AND"), v.literal("OR"), v.null())),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (args.fieldType) {
      const validFieldTypes = ["text", "number", "boolean", "date", "attachment", "displayText", "select", "userSelect"];
      if (!validFieldTypes.includes(args.fieldType)) {
        throw new Error(`Invalid field type. Must be one of: ${validFieldTypes.join(", ")}`);
      }
    }

    const { id, ...updates } = args;
    const filteredUpdates: Record<string, string | boolean | null> = {};

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        filteredUpdates[key] = value as string | boolean | null;
      }
    }

    await ctx.db.patch(id, filteredUpdates);
    return null;
  },
});

export const remove = mutation({
  args: { id: v.id("fieldTemplates") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const field = await ctx.db.get(args.id);
    if (!field) {
      return null;
    }

    const conditionsAsChild = await ctx.db
      .query("fieldConditions")
      .withIndex("by_child_field", (q) => q.eq("childFieldId", args.id))
      .collect();

    for (const condition of conditionsAsChild) {
      await ctx.db.delete(condition._id);
    }

    const conditionsAsParent = await ctx.db
      .query("fieldConditions")
      .withIndex("by_parent_field", (q) => q.eq("parentFieldId", args.id))
      .collect();

    for (const condition of conditionsAsParent) {
      await ctx.db.delete(condition._id);
    }

    await ctx.db.delete(args.id);

    const remainingFields = await ctx.db
      .query("fieldTemplates")
      .withIndex("by_task_template", (q) =>
        q.eq("taskTemplateId", field.taskTemplateId)
      )
      .collect();

    const sortedFields = remainingFields.sort((a, b) => a.order - b.order);
    for (let i = 0; i < sortedFields.length; i++) {
      if (sortedFields[i].order !== i) {
        await ctx.db.patch(sortedFields[i]._id, { order: i });
      }
    }

    return null;
  },
});

export const reorder = mutation({
  args: {
    taskTemplateId: v.id("taskTemplates"),
    fieldIds: v.array(v.id("fieldTemplates")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const taskTemplate = await ctx.db.get(args.taskTemplateId);
    if (!taskTemplate) {
      throw new Error("Task template not found");
    }

    const existingFields = await ctx.db
      .query("fieldTemplates")
      .withIndex("by_task_template", (q) =>
        q.eq("taskTemplateId", args.taskTemplateId)
      )
      .collect();

    const existingIds = new Set(existingFields.map((f) => f._id));
    for (const id of args.fieldIds) {
      if (!existingIds.has(id)) {
        throw new Error(`Field ${id} does not belong to this task template`);
      }
    }

    for (let i = 0; i < args.fieldIds.length; i++) {
      await ctx.db.patch(args.fieldIds[i], { order: i });
    }

    return null;
  },
});

export const bulkCreate = mutation({
  args: {
    taskTemplateId: v.id("taskTemplates"),
    fields: v.array(
      v.object({
        label: v.string(),
        fieldType: v.string(),
        isRequired: v.optional(v.boolean()),
        defaultValue: v.optional(v.string()),
        placeholder: v.optional(v.string()),
        subheader: v.optional(v.string()),
        displayStyle: v.optional(v.string()),
      })
    ),
  },
  returns: v.array(v.id("fieldTemplates")),
  handler: async (ctx, args) => {
    const taskTemplate = await ctx.db.get(args.taskTemplateId);
    if (!taskTemplate) {
      throw new Error("Task template not found");
    }

    const validFieldTypes = ["text", "number", "boolean", "date", "attachment", "displayText", "select", "userSelect"];
    for (const field of args.fields) {
      if (!validFieldTypes.includes(field.fieldType)) {
        throw new Error(`Invalid field type: ${field.fieldType}`);
      }
    }

    const existingFields = await ctx.db
      .query("fieldTemplates")
      .withIndex("by_task_template", (q) =>
        q.eq("taskTemplateId", args.taskTemplateId)
      )
      .collect();

    const startOrder = existingFields.length;
    const now = Date.now();

    const ids = [];
    for (let i = 0; i < args.fields.length; i++) {
      const field = args.fields[i];
      const id = await ctx.db.insert("fieldTemplates", {
        taskTemplateId: args.taskTemplateId,
        label: field.label,
        fieldType: field.fieldType,
        order: startOrder + i,
        isRequired: field.isRequired ?? false,
        defaultValue: field.defaultValue,
        placeholder: field.placeholder,
        subheader: field.subheader,
        displayStyle: field.displayStyle,
        createdAt: now,
      });
      ids.push(id);
    }

    return ids;
  },
});
