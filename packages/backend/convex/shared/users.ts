import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";

const userValidator = v.object({
  _id: v.id("users"),
  _creationTime: v.number(),
  clerkId: v.string(),
  email: v.string(),
  fullName: v.optional(v.string()),
  role: v.string(),
  isActive: v.boolean(),
  createdAt: v.number(),
  updatedAt: v.number(),
  rut: v.optional(v.string()),
  talanaId: v.optional(v.number()),
});

export const getByClerkId = query({
  args: { clerkId: v.string() },
  returns: v.union(userValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
  },
});

export const list = query({
  args: {},
  returns: v.array(userValidator),
  handler: async (ctx) => {
    return await ctx.db.query("users").collect();
  },
});

export const listActive = query({
  args: {},
  returns: v.array(userValidator),
  handler: async (ctx) => {
    return await ctx.db
      .query("users")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();
  },
});

export const listByRole = query({
  args: { role: v.string() },
  returns: v.array(userValidator),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", args.role))
      .collect();
  },
});

export const get = query({
  args: { id: v.id("users") },
  returns: v.union(userValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const upsertFromClerk = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    fullName: v.optional(v.string()),
  },
  returns: v.id("users"),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        email: args.email,
        fullName: args.fullName,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("users", {
      clerkId: args.clerkId,
      email: args.email,
      fullName: args.fullName,
      role: "field_worker",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateRole = mutation({
  args: {
    id: v.id("users"),
    role: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      role: args.role,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("users"),
    isActive: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      isActive: args.isActive,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const getByRut = query({
  args: { rut: v.string() },
  returns: v.union(userValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_rut", (q) => q.eq("rut", args.rut))
      .unique();
  },
});

export const getByEmail = query({
  args: { email: v.string() },
  returns: v.union(userValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();
  },
});

export const linkByRut = mutation({
  args: {
    clerkId: v.string(),
    rut: v.string(),
    email: v.string(),
    fullName: v.optional(v.string()),
  },
  returns: v.union(v.id("users"), v.null()),
  handler: async (ctx, args) => {
    const existingByRut = await ctx.db
      .query("users")
      .withIndex("by_rut", (q) => q.eq("rut", args.rut))
      .unique();

    if (existingByRut) {
      await ctx.db.patch(existingByRut._id, {
        clerkId: args.clerkId,
        email: args.email,
        fullName: args.fullName ?? existingByRut.fullName,
        updatedAt: Date.now(),
      });
      return existingByRut._id;
    }

    return null;
  },
});

export const deleteUser = mutation({
  args: { id: v.id("users") },
  returns: v.object({
    deleted: v.boolean(),
    assignmentsRemoved: v.number(),
    clerkDeletionScheduled: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.id);
    if (!user) {
      return { deleted: false, assignmentsRemoved: 0, clerkDeletionScheduled: false };
    }

    const assignments = await ctx.db
      .query("workOrderDayAssignments")
      .withIndex("by_user", (q) => q.eq("userId", args.id))
      .collect();

    for (const assignment of assignments) {
      await ctx.db.delete(assignment._id);
    }

    const isRealClerkUser =
      !user.clerkId.startsWith("talana_") && !user.clerkId.startsWith("test_");

    if (isRealClerkUser) {
      await ctx.scheduler.runAfter(0, internal.clerk.deleteFromClerk, {
        clerkId: user.clerkId,
      });
    }

    await ctx.db.delete(args.id);

    return {
      deleted: true,
      assignmentsRemoved: assignments.length,
      clerkDeletionScheduled: isRealClerkUser,
    };
  },
});
