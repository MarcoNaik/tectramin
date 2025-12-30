import { query, mutation } from "../_generated/server";
import { v } from "convex/values";

const lookupEntityTypeValidator = v.object({
  _id: v.id("lookupEntityTypes"),
  _creationTime: v.number(),
  name: v.string(),
  description: v.optional(v.string()),
  parentEntityTypeId: v.optional(v.id("lookupEntityTypes")),
  isActive: v.boolean(),
  createdAt: v.number(),
  updatedAt: v.number(),
});

export const list = query({
  args: {},
  returns: v.array(lookupEntityTypeValidator),
  handler: async (ctx) => {
    const types = await ctx.db.query("lookupEntityTypes").collect();
    return types.sort((a, b) => a.name.localeCompare(b.name));
  },
});

export const listActive = query({
  args: {},
  returns: v.array(lookupEntityTypeValidator),
  handler: async (ctx) => {
    const types = await ctx.db
      .query("lookupEntityTypes")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();
    return types.sort((a, b) => a.name.localeCompare(b.name));
  },
});

export const get = query({
  args: { id: v.id("lookupEntityTypes") },
  returns: v.union(lookupEntityTypeValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const listByParent = query({
  args: { parentEntityTypeId: v.optional(v.id("lookupEntityTypes")) },
  returns: v.array(lookupEntityTypeValidator),
  handler: async (ctx, args) => {
    if (args.parentEntityTypeId) {
      const types = await ctx.db
        .query("lookupEntityTypes")
        .withIndex("by_parent", (q) =>
          q.eq("parentEntityTypeId", args.parentEntityTypeId)
        )
        .collect();
      return types.sort((a, b) => a.name.localeCompare(b.name));
    }

    const types = await ctx.db.query("lookupEntityTypes").collect();
    const rootTypes = types.filter((t) => !t.parentEntityTypeId);
    return rootTypes.sort((a, b) => a.name.localeCompare(b.name));
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    parentEntityTypeId: v.optional(v.id("lookupEntityTypes")),
    isActive: v.optional(v.boolean()),
  },
  returns: v.id("lookupEntityTypes"),
  handler: async (ctx, args) => {
    if (args.parentEntityTypeId) {
      const parentType = await ctx.db.get(args.parentEntityTypeId);
      if (!parentType) {
        throw new Error("Parent entity type not found");
      }
      if (parentType.parentEntityTypeId) {
        throw new Error(
          "Cannot create child of a child entity type. Maximum 2 levels allowed."
        );
      }
    }

    const now = Date.now();
    return await ctx.db.insert("lookupEntityTypes", {
      name: args.name,
      description: args.description,
      parentEntityTypeId: args.parentEntityTypeId,
      isActive: args.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("lookupEntityTypes"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const entityType = await ctx.db.get(args.id);
    if (!entityType) {
      throw new Error("Entity type not found");
    }

    const { id, ...updates } = args;
    const filteredUpdates: Record<string, string | boolean | number | null> = {
      updatedAt: Date.now(),
    };

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
  args: { id: v.id("lookupEntityTypes") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const entityType = await ctx.db.get(args.id);
    if (!entityType) {
      return null;
    }

    const childTypes = await ctx.db
      .query("lookupEntityTypes")
      .withIndex("by_parent", (q) => q.eq("parentEntityTypeId", args.id))
      .collect();

    for (const childType of childTypes) {
      const childEntities = await ctx.db
        .query("lookupEntities")
        .withIndex("by_entity_type", (q) => q.eq("entityTypeId", childType._id))
        .collect();

      for (const entity of childEntities) {
        await ctx.db.delete(entity._id);
      }

      await ctx.db.delete(childType._id);
    }

    const entities = await ctx.db
      .query("lookupEntities")
      .withIndex("by_entity_type", (q) => q.eq("entityTypeId", args.id))
      .collect();

    for (const entity of entities) {
      await ctx.db.delete(entity._id);
    }

    await ctx.db.delete(args.id);
    return null;
  },
});
