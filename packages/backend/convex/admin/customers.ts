import { query, mutation } from "../_generated/server";
import { v } from "convex/values";

const customerValidator = v.object({
  _id: v.id("customers"),
  _creationTime: v.number(),
  name: v.string(),
  email: v.optional(v.string()),
  phone: v.optional(v.string()),
  rut: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
});

export const list = query({
  args: {},
  returns: v.array(customerValidator),
  handler: async (ctx) => {
    return await ctx.db.query("customers").collect();
  },
});

export const get = query({
  args: { id: v.id("customers") },
  returns: v.union(customerValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    rut: v.optional(v.string()),
  },
  returns: v.id("customers"),
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("customers", {
      name: args.name,
      email: args.email,
      phone: args.phone,
      rut: args.rut,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("customers"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    rut: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const filteredUpdates: Record<string, string | undefined> = {};

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
  args: { id: v.id("customers") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const faenas = await ctx.db
      .query("faenas")
      .withIndex("by_customer", (q) => q.eq("customerId", args.id))
      .collect();

    if (faenas.length > 0) {
      throw new Error("Cannot delete customer with existing faenas");
    }

    const workOrders = await ctx.db
      .query("workOrders")
      .withIndex("by_customer", (q) => q.eq("customerId", args.id))
      .collect();

    if (workOrders.length > 0) {
      throw new Error("Cannot delete customer with existing work orders");
    }

    await ctx.db.delete(args.id);
    return null;
  },
});
