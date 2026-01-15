import { query, mutation } from "../_generated/server";
import { v } from "convex/values";

const documentTemplateValidator = v.object({
  _id: v.id("documentTemplates"),
  _creationTime: v.number(),
  name: v.string(),
  description: v.optional(v.string()),
  sections: v.string(),
  globalFilters: v.string(),
  createdBy: v.string(),
  isGlobalTemplate: v.boolean(),
  createdAt: v.number(),
  updatedAt: v.number(),
});

export const list = query({
  args: { userId: v.string() },
  returns: v.array(documentTemplateValidator),
  handler: async (ctx, args) => {
    const userTemplates = await ctx.db
      .query("documentTemplates")
      .withIndex("by_user", (q) => q.eq("createdBy", args.userId))
      .collect();

    const globalTemplates = await ctx.db
      .query("documentTemplates")
      .withIndex("by_global", (q) => q.eq("isGlobalTemplate", true))
      .collect();

    const globalIds = new Set(globalTemplates.map((t) => t._id));
    const combined = [
      ...userTemplates.filter((t) => !globalIds.has(t._id)),
      ...globalTemplates,
    ];

    return combined.sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

export const listGlobal = query({
  args: {},
  returns: v.array(documentTemplateValidator),
  handler: async (ctx) => {
    return await ctx.db
      .query("documentTemplates")
      .withIndex("by_global", (q) => q.eq("isGlobalTemplate", true))
      .collect();
  },
});

export const listByUser = query({
  args: { userId: v.string() },
  returns: v.array(documentTemplateValidator),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("documentTemplates")
      .withIndex("by_user", (q) => q.eq("createdBy", args.userId))
      .collect();
  },
});

export const get = query({
  args: { id: v.id("documentTemplates") },
  returns: v.union(documentTemplateValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    sections: v.string(),
    globalFilters: v.string(),
    createdBy: v.string(),
    isGlobalTemplate: v.optional(v.boolean()),
  },
  returns: v.id("documentTemplates"),
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("documentTemplates", {
      name: args.name,
      description: args.description,
      sections: args.sections,
      globalFilters: args.globalFilters,
      createdBy: args.createdBy,
      isGlobalTemplate: args.isGlobalTemplate ?? false,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("documentTemplates"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    sections: v.optional(v.string()),
    globalFilters: v.optional(v.string()),
    isGlobalTemplate: v.optional(v.boolean()),
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
  args: { id: v.id("documentTemplates") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return null;
  },
});

export const duplicate = mutation({
  args: {
    id: v.id("documentTemplates"),
    newName: v.string(),
    createdBy: v.string(),
  },
  returns: v.id("documentTemplates"),
  handler: async (ctx, args) => {
    const original = await ctx.db.get(args.id);
    if (!original) {
      throw new Error("Document template not found");
    }

    const now = Date.now();

    return await ctx.db.insert("documentTemplates", {
      name: args.newName,
      description: original.description,
      sections: original.sections,
      globalFilters: original.globalFilters,
      createdBy: args.createdBy,
      isGlobalTemplate: false,
      createdAt: now,
      updatedAt: now,
    });
  },
});
