import { query, mutation } from "../_generated/server";
import { v } from "convex/values";

const lookupEntityValidator = v.object({
  _id: v.id("lookupEntities"),
  _creationTime: v.number(),
  entityTypeId: v.id("lookupEntityTypes"),
  value: v.string(),
  label: v.string(),
  parentEntityId: v.optional(v.id("lookupEntities")),
  displayOrder: v.number(),
  isActive: v.boolean(),
  createdAt: v.number(),
  updatedAt: v.number(),
});

export const listByType = query({
  args: { entityTypeId: v.id("lookupEntityTypes") },
  returns: v.array(lookupEntityValidator),
  handler: async (ctx, args) => {
    const entities = await ctx.db
      .query("lookupEntities")
      .withIndex("by_entity_type", (q) => q.eq("entityTypeId", args.entityTypeId))
      .collect();
    return entities.sort((a, b) => a.displayOrder - b.displayOrder);
  },
});

export const listActiveByType = query({
  args: { entityTypeId: v.id("lookupEntityTypes") },
  returns: v.array(lookupEntityValidator),
  handler: async (ctx, args) => {
    const entities = await ctx.db
      .query("lookupEntities")
      .withIndex("by_entity_type_and_active", (q) =>
        q.eq("entityTypeId", args.entityTypeId).eq("isActive", true)
      )
      .collect();
    return entities.sort((a, b) => a.displayOrder - b.displayOrder);
  },
});

export const listByParent = query({
  args: { parentEntityId: v.id("lookupEntities") },
  returns: v.array(lookupEntityValidator),
  handler: async (ctx, args) => {
    const entities = await ctx.db
      .query("lookupEntities")
      .withIndex("by_parent_entity", (q) =>
        q.eq("parentEntityId", args.parentEntityId)
      )
      .collect();
    return entities.sort((a, b) => a.displayOrder - b.displayOrder);
  },
});

export const listActiveByParent = query({
  args: { parentEntityId: v.id("lookupEntities") },
  returns: v.array(lookupEntityValidator),
  handler: async (ctx, args) => {
    const entities = await ctx.db
      .query("lookupEntities")
      .withIndex("by_parent_entity", (q) =>
        q.eq("parentEntityId", args.parentEntityId)
      )
      .collect();
    return entities
      .filter((e) => e.isActive)
      .sort((a, b) => a.displayOrder - b.displayOrder);
  },
});

export const get = query({
  args: { id: v.id("lookupEntities") },
  returns: v.union(lookupEntityValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    entityTypeId: v.id("lookupEntityTypes"),
    value: v.string(),
    label: v.string(),
    parentEntityId: v.optional(v.id("lookupEntities")),
    displayOrder: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  returns: v.id("lookupEntities"),
  handler: async (ctx, args) => {
    const entityType = await ctx.db.get(args.entityTypeId);
    if (!entityType) {
      throw new Error("Entity type not found");
    }

    if (entityType.parentEntityTypeId && !args.parentEntityId) {
      throw new Error("Parent entity is required for child entity types");
    }

    if (args.parentEntityId) {
      const parentEntity = await ctx.db.get(args.parentEntityId);
      if (!parentEntity) {
        throw new Error("Parent entity not found");
      }

      if (!entityType.parentEntityTypeId) {
        throw new Error("Cannot set parent entity for a root entity type");
      }

      const parentEntityType = await ctx.db.get(entityType.parentEntityTypeId);
      if (!parentEntityType) {
        throw new Error("Parent entity type not found");
      }

      if (parentEntity.entityTypeId !== entityType.parentEntityTypeId) {
        throw new Error("Parent entity must belong to the parent entity type");
      }
    }

    let displayOrder = args.displayOrder;
    if (displayOrder === undefined) {
      const existingEntities = await ctx.db
        .query("lookupEntities")
        .withIndex("by_entity_type", (q) =>
          q.eq("entityTypeId", args.entityTypeId)
        )
        .collect();
      displayOrder = existingEntities.length;
    }

    const now = Date.now();
    return await ctx.db.insert("lookupEntities", {
      entityTypeId: args.entityTypeId,
      value: args.value,
      label: args.label,
      parentEntityId: args.parentEntityId,
      displayOrder,
      isActive: args.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("lookupEntities"),
    value: v.optional(v.string()),
    label: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const entity = await ctx.db.get(args.id);
    if (!entity) {
      throw new Error("Entity not found");
    }

    const { id, ...updates } = args;
    const filteredUpdates: Record<string, string | boolean | number> = {
      updatedAt: Date.now(),
    };

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        filteredUpdates[key] = value as string | boolean;
      }
    }

    await ctx.db.patch(id, filteredUpdates);
    return null;
  },
});

export const remove = mutation({
  args: { id: v.id("lookupEntities") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const entity = await ctx.db.get(args.id);
    if (!entity) {
      return null;
    }

    const childEntities = await ctx.db
      .query("lookupEntities")
      .withIndex("by_parent_entity", (q) => q.eq("parentEntityId", args.id))
      .collect();

    for (const childEntity of childEntities) {
      await ctx.db.delete(childEntity._id);
    }

    await ctx.db.delete(args.id);

    const remainingEntities = await ctx.db
      .query("lookupEntities")
      .withIndex("by_entity_type", (q) =>
        q.eq("entityTypeId", entity.entityTypeId)
      )
      .collect();

    const sortedEntities = remainingEntities.sort(
      (a, b) => a.displayOrder - b.displayOrder
    );
    for (let i = 0; i < sortedEntities.length; i++) {
      if (sortedEntities[i].displayOrder !== i) {
        await ctx.db.patch(sortedEntities[i]._id, { displayOrder: i });
      }
    }

    return null;
  },
});

export const reorder = mutation({
  args: {
    entityTypeId: v.id("lookupEntityTypes"),
    entityIds: v.array(v.id("lookupEntities")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const entityType = await ctx.db.get(args.entityTypeId);
    if (!entityType) {
      throw new Error("Entity type not found");
    }

    const existingEntities = await ctx.db
      .query("lookupEntities")
      .withIndex("by_entity_type", (q) =>
        q.eq("entityTypeId", args.entityTypeId)
      )
      .collect();

    const existingIds = new Set(existingEntities.map((e) => e._id));
    for (const id of args.entityIds) {
      if (!existingIds.has(id)) {
        throw new Error(`Entity ${id} does not belong to this entity type`);
      }
    }

    for (let i = 0; i < args.entityIds.length; i++) {
      await ctx.db.patch(args.entityIds[i], { displayOrder: i });
    }

    return null;
  },
});
