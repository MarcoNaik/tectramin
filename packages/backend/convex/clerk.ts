import { internalMutation, internalQuery, internalAction, mutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

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
      const isPendingUser =
        existingByEmail.clerkId.startsWith("talana_") ||
        existingByEmail.clerkId.startsWith("test_");

      if (isPendingUser) {
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

export const syncAllFromClerk = internalAction({
  args: {},
  returns: v.object({
    synced: v.number(),
    skipped: v.number(),
  }),
  handler: async (ctx) => {
    const clerkSecretKey = process.env.CLERK_SECRET_KEY;
    if (!clerkSecretKey) {
      throw new Error("CLERK_SECRET_KEY not configured");
    }

    const { createClerkClient } = await import("@clerk/backend");
    const clerk = createClerkClient({ secretKey: clerkSecretKey });

    let synced = 0;
    let skipped = 0;
    let offset = 0;
    const limit = 100;

    while (true) {
      const response = await clerk.users.getUserList({
        limit,
        offset,
      });

      if (response.data.length === 0) {
        break;
      }

      for (const user of response.data) {
        const email = user.emailAddresses?.[0]?.emailAddress ?? "";
        const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ") || undefined;

        if (!email) {
          skipped++;
          continue;
        }

        await ctx.runMutation(internal.clerk.syncFromWebhook, {
          clerkId: user.id,
          email,
          fullName,
        });
        synced++;
      }

      if (response.data.length < limit) {
        break;
      }

      offset += limit;
    }

    return { synced, skipped };
  },
});

export const triggerSyncAllFromClerk = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    await ctx.scheduler.runAfter(0, internal.clerk.syncAllFromClerk, {});
    return null;
  },
});
