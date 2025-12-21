import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

const faenaValidator = v.object({
  _id: v.id("faenas"),
  _creationTime: v.number(),
  customerId: v.id("customers"),
  name: v.string(),
  location: v.optional(v.string()),
  isActive: v.boolean(),
  createdAt: v.number(),
  updatedAt: v.number(),
});

export const list = query({
  args: {},
  returns: v.array(faenaValidator),
  handler: async (ctx) => {
    return await ctx.db.query("faenas").collect();
  },
});

export const listByCustomer = query({
  args: { customerId: v.id("customers") },
  returns: v.array(faenaValidator),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("faenas")
      .withIndex("by_customer", (q) => q.eq("customerId", args.customerId))
      .collect();
  },
});

export const listActive = query({
  args: {},
  returns: v.array(faenaValidator),
  handler: async (ctx) => {
    const faenas = await ctx.db.query("faenas").collect();
    return faenas.filter((f) => f.isActive);
  },
});

export const get = query({
  args: { id: v.id("faenas") },
  returns: v.union(faenaValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    customerId: v.id("customers"),
    name: v.string(),
    location: v.optional(v.string()),
  },
  returns: v.id("faenas"),
  handler: async (ctx, args) => {
    const customer = await ctx.db.get(args.customerId);
    if (!customer) {
      throw new Error("Customer not found");
    }

    const now = Date.now();
    return await ctx.db.insert("faenas", {
      customerId: args.customerId,
      name: args.name,
      location: args.location,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("faenas"),
    name: v.optional(v.string()),
    location: v.optional(v.string()),
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
  args: { id: v.id("faenas") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const workOrders = await ctx.db
      .query("workOrders")
      .withIndex("by_faena", (q) => q.eq("faenaId", args.id))
      .collect();

    if (workOrders.length > 0) {
      throw new Error("Cannot delete faena with existing work orders");
    }

    await ctx.db.delete(args.id);
    return null;
  },
});
