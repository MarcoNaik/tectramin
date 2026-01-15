import { query, mutation } from "../_generated/server";
import { v } from "convex/values";

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

export const checkOnboardingStatus = query({
  args: { clerkId: v.string() },
  returns: v.object({
    needsOnboarding: v.boolean(),
    user: v.union(userValidator, v.null()),
  }),
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (user) {
      return { needsOnboarding: false, user };
    }

    return { needsOnboarding: true, user: null };
  },
});

export const findPotentialMatches = query({
  args: {
    clerkId: v.string(),
    email: v.string(),
    fullName: v.optional(v.string()),
  },
  returns: v.array(
    v.object({
      user: userValidator,
      matchType: v.string(),
      confidence: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (existingUser) {
      return [];
    }

    const allUsers = await ctx.db.query("users").collect();
    const pendingUsers = allUsers.filter((u) => u.clerkId.startsWith("talana_"));

    const matches: Array<{
      user: typeof allUsers[0];
      matchType: string;
      confidence: number;
    }> = [];

    const matchedUserIds = new Set<string>();
    const emailDomain = args.email.split("@")[1]?.toLowerCase();

    for (const user of pendingUsers) {
      const userEmailDomain = user.email.split("@")[1]?.toLowerCase();

      if (user.email.toLowerCase() === args.email.toLowerCase()) {
        matches.push({ user, matchType: "email_exact", confidence: 1.0 });
        matchedUserIds.add(user._id);
        continue;
      }

      if (emailDomain && userEmailDomain && emailDomain === userEmailDomain) {
        let confidence = 0.5;

        if (args.fullName && user.fullName) {
          const inputName = args.fullName.toLowerCase().trim();
          const userName = user.fullName.toLowerCase().trim();

          if (inputName === userName) {
            confidence = 0.9;
          } else {
            const inputParts = inputName.split(/\s+/);
            const userParts = userName.split(/\s+/);
            const commonParts = inputParts.filter((p) =>
              userParts.some((up) => up.includes(p) || p.includes(up))
            );
            if (commonParts.length > 0) {
              confidence = 0.6 + (commonParts.length / inputParts.length) * 0.2;
            }
          }
        }

        matches.push({ user, matchType: "email_domain", confidence });
        matchedUserIds.add(user._id);
      }
    }

    matches.sort((a, b) => b.confidence - a.confidence);

    const MIN_MATCHES = 3;
    if (matches.length < MIN_MATCHES) {
      const remainingUsers = pendingUsers
        .filter((u) => !matchedUserIds.has(u._id))
        .sort((a, b) => (a.fullName ?? a.email).localeCompare(b.fullName ?? b.email));

      for (const user of remainingUsers) {
        matches.push({ user, matchType: "directory", confidence: 0 });
      }
    }

    return matches;
  },
});

export const linkSelf = mutation({
  args: {
    clerkId: v.string(),
    talanaUserId: v.id("users"),
    email: v.string(),
    fullName: v.optional(v.string()),
  },
  returns: v.id("users"),
  handler: async (ctx, args) => {
    const talanaUser = await ctx.db.get(args.talanaUserId);
    if (!talanaUser) {
      throw new Error("Talana user not found");
    }
    if (!talanaUser.clerkId.startsWith("talana_")) {
      throw new Error("User is not a pending Talana user");
    }

    const existingClerkUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (existingClerkUser && existingClerkUser._id !== args.talanaUserId) {
      await ctx.db.delete(existingClerkUser._id);
    }

    await ctx.db.patch(args.talanaUserId, {
      clerkId: args.clerkId,
      email: args.email,
      fullName: args.fullName ?? talanaUser.fullName,
      updatedAt: Date.now(),
    });

    return args.talanaUserId;
  },
});

export const createSelf = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    fullName: v.optional(v.string()),
  },
  returns: v.id("users"),
  handler: async (ctx, args) => {
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (existingUser) {
      return existingUser._id;
    }

    const now = Date.now();
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
