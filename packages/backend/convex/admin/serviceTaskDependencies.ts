import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";

const dependencyValidator = v.object({
  _id: v.id("serviceTaskDependencies"),
  _creationTime: v.number(),
  serviceTaskTemplateId: v.id("serviceTaskTemplates"),
  dependsOnServiceTaskTemplateId: v.id("serviceTaskTemplates"),
  serviceId: v.id("services"),
  createdAt: v.number(),
});

export const listByService = query({
  args: { serviceId: v.id("services") },
  returns: v.array(dependencyValidator),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("serviceTaskDependencies")
      .withIndex("by_service", (q) => q.eq("serviceId", args.serviceId))
      .collect();
  },
});

export const listByDependentTask = query({
  args: { serviceTaskTemplateId: v.id("serviceTaskTemplates") },
  returns: v.array(dependencyValidator),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("serviceTaskDependencies")
      .withIndex("by_dependent", (q) => q.eq("serviceTaskTemplateId", args.serviceTaskTemplateId))
      .collect();
  },
});

function hasCircularDependency(
  taskId: Id<"serviceTaskTemplates">,
  newPrereqId: Id<"serviceTaskTemplates">,
  existingDeps: Array<{ serviceTaskTemplateId: Id<"serviceTaskTemplates">; dependsOnServiceTaskTemplateId: Id<"serviceTaskTemplates"> }>
): boolean {
  const graph = new Map<Id<"serviceTaskTemplates">, Set<Id<"serviceTaskTemplates">>>();

  for (const dep of existingDeps) {
    if (!graph.has(dep.serviceTaskTemplateId)) {
      graph.set(dep.serviceTaskTemplateId, new Set());
    }
    graph.get(dep.serviceTaskTemplateId)!.add(dep.dependsOnServiceTaskTemplateId);
  }

  if (!graph.has(taskId)) {
    graph.set(taskId, new Set());
  }
  graph.get(taskId)!.add(newPrereqId);

  const visited = new Set<Id<"serviceTaskTemplates">>();
  const recStack = new Set<Id<"serviceTaskTemplates">>();

  function dfs(node: Id<"serviceTaskTemplates">): boolean {
    visited.add(node);
    recStack.add(node);

    const neighbors = graph.get(node) || new Set();
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor)) return true;
      } else if (recStack.has(neighbor)) {
        return true;
      }
    }

    recStack.delete(node);
    return false;
  }

  return dfs(taskId);
}

export const create = mutation({
  args: {
    serviceTaskTemplateId: v.id("serviceTaskTemplates"),
    dependsOnServiceTaskTemplateId: v.id("serviceTaskTemplates"),
  },
  returns: v.id("serviceTaskDependencies"),
  handler: async (ctx, args) => {
    if (args.serviceTaskTemplateId === args.dependsOnServiceTaskTemplateId) {
      throw new Error("A task cannot depend on itself");
    }

    const dependentTask = await ctx.db.get(args.serviceTaskTemplateId);
    if (!dependentTask) {
      throw new Error("Dependent task not found");
    }

    const prerequisiteTask = await ctx.db.get(args.dependsOnServiceTaskTemplateId);
    if (!prerequisiteTask) {
      throw new Error("Prerequisite task not found");
    }

    if (dependentTask.serviceId !== prerequisiteTask.serviceId) {
      throw new Error("Both tasks must belong to the same service");
    }

    const existingDep = await ctx.db
      .query("serviceTaskDependencies")
      .withIndex("by_dependent", (q) => q.eq("serviceTaskTemplateId", args.serviceTaskTemplateId))
      .filter((q) => q.eq(q.field("dependsOnServiceTaskTemplateId"), args.dependsOnServiceTaskTemplateId))
      .unique();

    if (existingDep) {
      throw new Error("This dependency already exists");
    }

    const allDeps = await ctx.db
      .query("serviceTaskDependencies")
      .withIndex("by_service", (q) => q.eq("serviceId", dependentTask.serviceId))
      .collect();

    if (hasCircularDependency(args.serviceTaskTemplateId, args.dependsOnServiceTaskTemplateId, allDeps)) {
      throw new Error("Adding this dependency would create a circular dependency");
    }

    return await ctx.db.insert("serviceTaskDependencies", {
      serviceTaskTemplateId: args.serviceTaskTemplateId,
      dependsOnServiceTaskTemplateId: args.dependsOnServiceTaskTemplateId,
      serviceId: dependentTask.serviceId,
      createdAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("serviceTaskDependencies") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const dependency = await ctx.db.get(args.id);
    if (!dependency) {
      return null;
    }

    await ctx.db.delete(args.id);
    return null;
  },
});

export const removeAllForTask = mutation({
  args: { serviceTaskTemplateId: v.id("serviceTaskTemplates") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const depsAsDependant = await ctx.db
      .query("serviceTaskDependencies")
      .withIndex("by_dependent", (q) => q.eq("serviceTaskTemplateId", args.serviceTaskTemplateId))
      .collect();

    for (const dep of depsAsDependant) {
      await ctx.db.delete(dep._id);
    }

    const depsAsPrereq = await ctx.db
      .query("serviceTaskDependencies")
      .withIndex("by_prerequisite", (q) => q.eq("dependsOnServiceTaskTemplateId", args.serviceTaskTemplateId))
      .collect();

    for (const dep of depsAsPrereq) {
      await ctx.db.delete(dep._id);
    }

    return null;
  },
});
