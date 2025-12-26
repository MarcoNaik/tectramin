import { query, mutation } from "../_generated/server";
import { v } from "convex/values";

const fieldConditionValidator = v.object({
  _id: v.id("fieldConditions"),
  _creationTime: v.number(),
  childFieldId: v.id("fieldTemplates"),
  parentFieldId: v.id("fieldTemplates"),
  operator: v.string(),
  value: v.union(v.string(), v.array(v.string())),
  conditionGroup: v.number(),
  createdAt: v.number(),
});

export const listByChildField = query({
  args: { childFieldId: v.id("fieldTemplates") },
  returns: v.array(fieldConditionValidator),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("fieldConditions")
      .withIndex("by_child_field", (q) => q.eq("childFieldId", args.childFieldId))
      .collect();
  },
});

export const listByParentField = query({
  args: { parentFieldId: v.id("fieldTemplates") },
  returns: v.array(fieldConditionValidator),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("fieldConditions")
      .withIndex("by_parent_field", (q) => q.eq("parentFieldId", args.parentFieldId))
      .collect();
  },
});

export const listByTaskTemplate = query({
  args: { taskTemplateId: v.id("taskTemplates") },
  returns: v.array(fieldConditionValidator),
  handler: async (ctx, args) => {
    const fields = await ctx.db
      .query("fieldTemplates")
      .withIndex("by_task_template", (q) => q.eq("taskTemplateId", args.taskTemplateId))
      .collect();

    const fieldIds = new Set(fields.map((f) => f._id));
    const allConditions: Array<typeof fieldConditionValidator._type> = [];

    for (const field of fields) {
      const conditions = await ctx.db
        .query("fieldConditions")
        .withIndex("by_child_field", (q) => q.eq("childFieldId", field._id))
        .collect();
      allConditions.push(...conditions);
    }

    return allConditions;
  },
});

const validOperators = [
  "equals",
  "notEquals",
  "contains",
  "isEmpty",
  "isNotEmpty",
  "greaterThan",
  "lessThan",
  "greaterOrEqual",
  "lessOrEqual",
  "before",
  "after",
  "onOrBefore",
  "onOrAfter",
  "includes",
];

export const create = mutation({
  args: {
    childFieldId: v.id("fieldTemplates"),
    parentFieldId: v.id("fieldTemplates"),
    operator: v.string(),
    value: v.union(v.string(), v.array(v.string())),
    conditionGroup: v.optional(v.number()),
  },
  returns: v.id("fieldConditions"),
  handler: async (ctx, args) => {
    const childField = await ctx.db.get(args.childFieldId);
    if (!childField) {
      throw new Error("Child field not found");
    }

    const parentField = await ctx.db.get(args.parentFieldId);
    if (!parentField) {
      throw new Error("Parent field not found");
    }

    if (childField.taskTemplateId !== parentField.taskTemplateId) {
      throw new Error("Parent and child fields must belong to the same task template");
    }

    if (parentField.order >= childField.order) {
      throw new Error("Parent field must come before child field in order");
    }

    if (parentField.fieldType === "displayText") {
      throw new Error("displayText fields cannot be used as condition parents");
    }

    if (!validOperators.includes(args.operator)) {
      throw new Error(`Invalid operator. Must be one of: ${validOperators.join(", ")}`);
    }

    const conditionGroup = args.conditionGroup ?? 0;

    return await ctx.db.insert("fieldConditions", {
      childFieldId: args.childFieldId,
      parentFieldId: args.parentFieldId,
      operator: args.operator,
      value: args.value,
      conditionGroup,
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("fieldConditions"),
    operator: v.optional(v.string()),
    value: v.optional(v.union(v.string(), v.array(v.string()))),
    conditionGroup: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const condition = await ctx.db.get(args.id);
    if (!condition) {
      throw new Error("Condition not found");
    }

    if (args.operator && !validOperators.includes(args.operator)) {
      throw new Error(`Invalid operator. Must be one of: ${validOperators.join(", ")}`);
    }

    const { id, ...updates } = args;
    const filteredUpdates: Record<string, string | string[] | number | undefined> = {};

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        filteredUpdates[key] = value;
      }
    }

    await ctx.db.patch(id, filteredUpdates);
    return null;
  },
});

export const remove = mutation({
  args: { id: v.id("fieldConditions") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const condition = await ctx.db.get(args.id);
    if (!condition) {
      return null;
    }

    await ctx.db.delete(args.id);
    return null;
  },
});

export const removeAllForChild = mutation({
  args: { childFieldId: v.id("fieldTemplates") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const conditions = await ctx.db
      .query("fieldConditions")
      .withIndex("by_child_field", (q) => q.eq("childFieldId", args.childFieldId))
      .collect();

    for (const condition of conditions) {
      await ctx.db.delete(condition._id);
    }

    return null;
  },
});
