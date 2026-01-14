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

export const getTalanaUsers = query({
  args: {},
  returns: v.array(userValidator),
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    return users.filter((u) => u.clerkId.startsWith("talana_"));
  },
});

export const getClerkOnlyUsers = query({
  args: {},
  returns: v.array(userValidator),
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    return users.filter(
      (u) =>
        !u.clerkId.startsWith("talana_") &&
        !u.clerkId.startsWith("test_") &&
        !u.talanaId
    );
  },
});

export const getLinkedUsers = query({
  args: {},
  returns: v.array(userValidator),
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    return users.filter(
      (u) =>
        !u.clerkId.startsWith("talana_") &&
        !u.clerkId.startsWith("test_") &&
        u.talanaId
    );
  },
});

export const findPotentialMatches = query({
  args: {
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
    const talanaUsers = await ctx.db.query("users").collect();
    const pendingUsers = talanaUsers.filter((u) =>
      u.clerkId.startsWith("talana_")
    );

    const matches: Array<{
      user: typeof talanaUsers[0];
      matchType: string;
      confidence: number;
    }> = [];

    const emailDomain = args.email.split("@")[1]?.toLowerCase();

    for (const user of pendingUsers) {
      const userEmailDomain = user.email.split("@")[1]?.toLowerCase();

      if (user.email.toLowerCase() === args.email.toLowerCase()) {
        matches.push({ user, matchType: "email_exact", confidence: 1.0 });
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
      }
    }

    matches.sort((a, b) => b.confidence - a.confidence);
    return matches;
  },
});

export const linkTalanaToClerk = mutation({
  args: {
    talanaUserId: v.id("users"),
    clerkId: v.string(),
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

export const unlinkFromTalana = mutation({
  args: { userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    if (user.talanaId) {
      await ctx.db.patch(args.userId, {
        clerkId: `talana_${user.talanaId}`,
        talanaId: undefined,
        updatedAt: Date.now(),
      });
    }

    return null;
  },
});
