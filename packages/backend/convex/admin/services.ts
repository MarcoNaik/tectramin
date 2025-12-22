import { query, mutation } from "../_generated/server";
import { v } from "convex/values";

const serviceValidator = v.object({
  _id: v.id("services"),
  _creationTime: v.number(),
  name: v.string(),
  description: v.optional(v.string()),
  defaultDays: v.number(),
  requiredPeople: v.number(),
  isActive: v.boolean(),
  createdAt: v.number(),
  updatedAt: v.number(),
});

export const list = query({
  args: {},
  returns: v.array(serviceValidator),
  handler: async (ctx) => {
    return await ctx.db.query("services").collect();
  },
});

export const listActive = query({
  args: {},
  returns: v.array(serviceValidator),
  handler: async (ctx) => {
    const services = await ctx.db.query("services").collect();
    return services.filter((s) => s.isActive);
  },
});

export const get = query({
  args: { id: v.id("services") },
  returns: v.union(serviceValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getWithTaskTemplates = query({
  args: { id: v.id("services") },
  returns: v.union(
    v.object({
      service: serviceValidator,
      taskTemplates: v.array(
        v.object({
          _id: v.id("serviceTaskTemplates"),
          taskTemplateId: v.id("taskTemplates"),
          taskTemplateName: v.string(),
          order: v.number(),
          isRequired: v.boolean(),
          dayNumber: v.optional(v.number()),
        })
      ),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const service = await ctx.db.get(args.id);
    if (!service) {
      return null;
    }

    const links = await ctx.db
      .query("serviceTaskTemplates")
      .withIndex("by_service", (q) => q.eq("serviceId", args.id))
      .collect();

    const taskTemplates = await Promise.all(
      links.map(async (link) => {
        const template = await ctx.db.get(link.taskTemplateId);
        return {
          _id: link._id,
          taskTemplateId: link.taskTemplateId,
          taskTemplateName: template?.name ?? "Unknown",
          order: link.order,
          isRequired: link.isRequired,
          dayNumber: link.dayNumber,
        };
      })
    );

    return {
      service,
      taskTemplates: taskTemplates.sort((a, b) => a.order - b.order),
    };
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    defaultDays: v.number(),
    requiredPeople: v.number(),
  },
  returns: v.id("services"),
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("services", {
      name: args.name,
      description: args.description,
      defaultDays: args.defaultDays,
      requiredPeople: args.requiredPeople,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("services"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    defaultDays: v.optional(v.number()),
    requiredPeople: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const filteredUpdates: Record<string, string | number | boolean | undefined> = {};

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
  args: { id: v.id("services") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const workOrders = await ctx.db
      .query("workOrders")
      .filter((q) => q.eq(q.field("serviceId"), args.id))
      .collect();

    if (workOrders.length > 0) {
      throw new Error("Cannot delete service with existing work orders");
    }

    const links = await ctx.db
      .query("serviceTaskTemplates")
      .withIndex("by_service", (q) => q.eq("serviceId", args.id))
      .collect();

    for (const link of links) {
      await ctx.db.delete(link._id);
    }

    await ctx.db.delete(args.id);
    return null;
  },
});

export const addTaskTemplate = mutation({
  args: {
    serviceId: v.id("services"),
    taskTemplateId: v.id("taskTemplates"),
    order: v.number(),
    isRequired: v.boolean(),
    dayNumber: v.optional(v.number()),
  },
  returns: v.id("serviceTaskTemplates"),
  handler: async (ctx, args) => {
    const service = await ctx.db.get(args.serviceId);
    if (!service) {
      throw new Error("Service not found");
    }

    const taskTemplate = await ctx.db.get(args.taskTemplateId);
    if (!taskTemplate) {
      throw new Error("Task template not found");
    }

    const existing = await ctx.db
      .query("serviceTaskTemplates")
      .withIndex("by_service", (q) => q.eq("serviceId", args.serviceId))
      .filter((q) => q.eq(q.field("taskTemplateId"), args.taskTemplateId))
      .unique();

    if (existing) {
      throw new Error("Task template already linked to service");
    }

    return await ctx.db.insert("serviceTaskTemplates", {
      serviceId: args.serviceId,
      taskTemplateId: args.taskTemplateId,
      order: args.order,
      isRequired: args.isRequired,
      dayNumber: args.dayNumber,
    });
  },
});

export const updateTaskTemplateLink = mutation({
  args: {
    id: v.id("serviceTaskTemplates"),
    order: v.optional(v.number()),
    isRequired: v.optional(v.boolean()),
    dayNumber: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const filteredUpdates: Record<string, number | boolean | undefined> = {};

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        filteredUpdates[key] = value;
      }
    }

    await ctx.db.patch(id, filteredUpdates);
    return null;
  },
});

export const removeTaskTemplate = mutation({
  args: {
    serviceId: v.id("services"),
    taskTemplateId: v.id("taskTemplates"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const link = await ctx.db
      .query("serviceTaskTemplates")
      .withIndex("by_service", (q) => q.eq("serviceId", args.serviceId))
      .filter((q) => q.eq(q.field("taskTemplateId"), args.taskTemplateId))
      .unique();

    if (link) {
      await ctx.db.delete(link._id);
    }

    return null;
  },
});
