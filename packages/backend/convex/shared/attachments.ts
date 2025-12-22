import { query, mutation } from "../_generated/server";
import { v } from "convex/values";

const attachmentValidator = v.object({
  _id: v.id("attachments"),
  _creationTime: v.number(),
  clientId: v.string(),
  fieldResponseId: v.optional(v.id("fieldResponses")),
  fieldResponseClientId: v.string(),
  storageId: v.optional(v.id("_storage")),
  fileName: v.string(),
  fileType: v.string(),
  mimeType: v.string(),
  fileSize: v.number(),
  userId: v.string(),
  uploadStatus: v.string(),
  createdAt: v.number(),
  updatedAt: v.number(),
});

export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const saveAfterUpload = mutation({
  args: {
    clientId: v.string(),
    fieldResponseClientId: v.string(),
    storageId: v.id("_storage"),
    fileName: v.string(),
    fileType: v.string(),
    mimeType: v.string(),
    fileSize: v.number(),
    userId: v.string(),
  },
  returns: v.id("attachments"),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("attachments")
      .withIndex("by_client_id", (q) => q.eq("clientId", args.clientId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        storageId: args.storageId,
        uploadStatus: "uploaded",
        updatedAt: Date.now(),
      });
      return existing._id;
    }

    return await ctx.db.insert("attachments", {
      ...args,
      uploadStatus: "uploaded",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const getByFieldResponse = query({
  args: { fieldResponseClientId: v.string() },
  returns: v.union(attachmentValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("attachments")
      .withIndex("by_field_response_client_id", (q) =>
        q.eq("fieldResponseClientId", args.fieldResponseClientId)
      )
      .unique();
  },
});

export const getUrl = query({
  args: { storageId: v.id("_storage") },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

export const getUrlByClientId = query({
  args: { clientId: v.string() },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    const attachment = await ctx.db
      .query("attachments")
      .withIndex("by_client_id", (q) => q.eq("clientId", args.clientId))
      .unique();

    if (!attachment || !attachment.storageId) {
      return null;
    }

    return await ctx.storage.getUrl(attachment.storageId);
  },
});

export const remove = mutation({
  args: { clientId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const attachment = await ctx.db
      .query("attachments")
      .withIndex("by_client_id", (q) => q.eq("clientId", args.clientId))
      .unique();

    if (!attachment) {
      return null;
    }

    if (attachment.storageId) {
      await ctx.storage.delete(attachment.storageId);
    }

    await ctx.db.delete(attachment._id);
    return null;
  },
});
