import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  tasks: defineTable({
    clientId: v.string(),
    text: v.string(),
    isCompleted: v.boolean(),
    userId: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_client_id", ["clientId"])
    .index("by_user_and_updated", ["userId", "updatedAt"]),
});
