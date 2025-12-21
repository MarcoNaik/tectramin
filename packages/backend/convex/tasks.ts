import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const get = query({
  args: { userId: v.string() },
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
    return await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

export const create = mutation({
  args: {
    clientId: v.string(),
    text: v.string(),
    userId: v.string(),
  },
  returns: v.id("tasks"),
  handler: async (ctx, args) => {
    const now = Date.now();
    const taskId = await ctx.db.insert("tasks", {
      clientId: args.clientId,
      text: args.text,
      isCompleted: false,
      userId: args.userId,
      createdAt: now,
      updatedAt: now,
    });
    return taskId;
  },
});

export const toggle = mutation({
  args: { id: v.id("tasks") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.id);
    if (!task) throw new Error("Task not found");
    await ctx.db.patch(args.id, {
      isCompleted: !task.isCompleted,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const remove = mutation({
  args: { id: v.id("tasks") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return null;
  },
});
