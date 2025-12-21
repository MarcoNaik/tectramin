import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const upsertTask = mutation({
  args: {
    clientId: v.string(),
    text: v.string(),
    isCompleted: v.boolean(),
    userId: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  },
  returns: v.object({
    serverId: v.string(),
  }),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("tasks")
      .withIndex("by_client_id", (q) => q.eq("clientId", args.clientId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        text: args.text,
        isCompleted: args.isCompleted,
        updatedAt: args.updatedAt,
      });
      return { serverId: existing._id };
    }

    const id = await ctx.db.insert("tasks", {
      clientId: args.clientId,
      text: args.text,
      isCompleted: args.isCompleted,
      userId: args.userId,
      createdAt: args.createdAt,
      updatedAt: args.updatedAt,
    });
    return { serverId: id };
  },
});

export const getTaskChangesSince = query({
  args: {
    userId: v.string(),
    since: v.number(),
  },
  returns: v.array(
    v.object({
      _id: v.id("tasks"),
      _creationTime: v.number(),
      clientId: v.string(),
      text: v.string(),
      isCompleted: v.boolean(),
      userId: v.string(),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_user_and_updated", (q) =>
        q.eq("userId", args.userId).gt("updatedAt", args.since)
      )
      .collect();
    return tasks;
  },
});

export const getAllTasksForUser = query({
  args: {
    userId: v.string(),
  },
  returns: v.array(
    v.object({
      _id: v.id("tasks"),
      _creationTime: v.number(),
      clientId: v.string(),
      text: v.string(),
      isCompleted: v.boolean(),
      userId: v.string(),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    return tasks;
  },
});
