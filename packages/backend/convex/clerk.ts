import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const syncFromWebhook = internalMutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    fullName: v.optional(v.string()),
  },
  returns: v.id("users"),
  handler: async (ctx, args) => {
    const existingByClerkId = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    const now = Date.now();

    if (existingByClerkId) {
      await ctx.db.patch(existingByClerkId._id, {
        email: args.email,
        fullName: args.fullName ?? existingByClerkId.fullName,
        updatedAt: now,
      });
      return existingByClerkId._id;
    }

    const existingByEmail = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();

    if (existingByEmail) {
      if (existingByEmail.clerkId.startsWith("talana_")) {
        await ctx.db.patch(existingByEmail._id, {
          clerkId: args.clerkId,
          fullName: args.fullName ?? existingByEmail.fullName,
          updatedAt: now,
        });
        return existingByEmail._id;
      }
      await ctx.db.patch(existingByEmail._id, {
        fullName: args.fullName ?? existingByEmail.fullName,
        updatedAt: now,
      });
      return existingByEmail._id;
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

export const deleteFromWebhook = internalMutation({
  args: { clerkId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        isActive: false,
        updatedAt: Date.now(),
      });
    }
    return null;
  },
});

export const getByClerkId = internalQuery({
  args: { clerkId: v.string() },
  returns: v.union(
    v.object({
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
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
  },
});
