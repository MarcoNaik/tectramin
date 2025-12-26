import { query, mutation } from "../_generated/server";
import { v } from "convex/values";

const taskTemplateValidator = v.object({
  _id: v.id("taskTemplates"),
  _creationTime: v.number(),
  name: v.string(),
  description: v.optional(v.string()),
  category: v.optional(v.string()),
  isRepeatable: v.boolean(),
  isActive: v.boolean(),
  createdAt: v.number(),
  updatedAt: v.number(),
});

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

export const list = query({
  args: {},
  returns: v.array(taskTemplateValidator),
  handler: async (ctx) => {
    return await ctx.db.query("taskTemplates").collect();
  },
});

export const listActive = query({
  args: {},
  returns: v.array(taskTemplateValidator),
  handler: async (ctx) => {
    return await ctx.db
      .query("taskTemplates")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();
  },
});

export const listByCategory = query({
  args: { category: v.string() },
  returns: v.array(taskTemplateValidator),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("taskTemplates")
      .withIndex("by_category", (q) => q.eq("category", args.category))
      .collect();
  },
});

export const getCategories = query({
  args: {},
  returns: v.array(v.string()),
  handler: async (ctx) => {
    const templates = await ctx.db.query("taskTemplates").collect();
    const categories = new Set<string>();
    for (const template of templates) {
      if (template.category) {
        categories.add(template.category);
      }
    }
    return Array.from(categories).sort();
  },
});

export const get = query({
  args: { id: v.id("taskTemplates") },
  returns: v.union(taskTemplateValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getWithFields = query({
  args: { id: v.id("taskTemplates") },
  returns: v.union(
    v.object({
      template: taskTemplateValidator,
      fields: v.array(fieldTemplateValidator),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const template = await ctx.db.get(args.id);
    if (!template) {
      return null;
    }

    const fields = await ctx.db
      .query("fieldTemplates")
      .withIndex("by_task_template", (q) => q.eq("taskTemplateId", args.id))
      .collect();

    return {
      template,
      fields: fields.sort((a, b) => a.order - b.order),
    };
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    isRepeatable: v.optional(v.boolean()),
  },
  returns: v.id("taskTemplates"),
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("taskTemplates", {
      name: args.name,
      description: args.description,
      category: args.category,
      isRepeatable: args.isRepeatable ?? false,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("taskTemplates"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    isRepeatable: v.optional(v.boolean()),
    isActive: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const filteredUpdates: Record<string, string | boolean | undefined> = {};

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        filteredUpdates[key] = value;
      }
    }

    await ctx.db.patch(id, {
      ...filteredUpdates,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const remove = mutation({
  args: { id: v.id("taskTemplates") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const serviceLinks = await ctx.db
      .query("serviceTaskTemplates")
      .withIndex("by_task_template", (q) => q.eq("taskTemplateId", args.id))
      .collect();

    if (serviceLinks.length > 0) {
      throw new Error("Cannot delete task template linked to services");
    }

    const workOrderDayLinks = await ctx.db
      .query("workOrderDayTaskTemplates")
      .withIndex("by_task_template", (q) => q.eq("taskTemplateId", args.id))
      .collect();

    if (workOrderDayLinks.length > 0) {
      throw new Error("Cannot delete task template used in work orders");
    }

    const fields = await ctx.db
      .query("fieldTemplates")
      .withIndex("by_task_template", (q) => q.eq("taskTemplateId", args.id))
      .collect();

    for (const field of fields) {
      await ctx.db.delete(field._id);
    }

    await ctx.db.delete(args.id);
    return null;
  },
});

export const duplicate = mutation({
  args: {
    id: v.id("taskTemplates"),
    newName: v.string(),
  },
  returns: v.id("taskTemplates"),
  handler: async (ctx, args) => {
    const original = await ctx.db.get(args.id);
    if (!original) {
      throw new Error("Task template not found");
    }

    const now = Date.now();

    const newTemplateId = await ctx.db.insert("taskTemplates", {
      name: args.newName,
      description: original.description,
      category: original.category,
      isRepeatable: original.isRepeatable,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    const fields = await ctx.db
      .query("fieldTemplates")
      .withIndex("by_task_template", (q) => q.eq("taskTemplateId", args.id))
      .collect();

    for (const field of fields) {
      await ctx.db.insert("fieldTemplates", {
        taskTemplateId: newTemplateId,
        label: field.label,
        fieldType: field.fieldType,
        order: field.order,
        isRequired: field.isRequired,
        defaultValue: field.defaultValue,
        placeholder: field.placeholder,
        createdAt: now,
      });
    }

    return newTemplateId;
  },
});
