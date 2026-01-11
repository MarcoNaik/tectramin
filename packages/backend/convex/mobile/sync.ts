import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { isTaskInstanceOrphaned, filterNonOrphanedInstances, getOrphanedInstances } from "../shared/orphanDetection";

export const upsertTaskInstance = mutation({
  args: {
    clientId: v.string(),
    workOrderDayServerId: v.string(),
    dayTaskTemplateServerId: v.optional(v.string()),
    workOrderDayServiceServerId: v.optional(v.string()),
    serviceTaskTemplateServerId: v.optional(v.string()),
    taskTemplateServerId: v.string(),
    userId: v.string(),
    instanceLabel: v.optional(v.string()),
    status: v.string(),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  },
  returns: v.object({
    serverId: v.string(),
  }),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("taskInstances")
      .withIndex("by_client_id", (q) => q.eq("clientId", args.clientId))
      .unique();

    const workOrderDayId = args.workOrderDayServerId as unknown as ReturnType<
      typeof v.id<"workOrderDays">
    >["type"];
    const workOrderDayTaskTemplateId = args.dayTaskTemplateServerId
      ? (args.dayTaskTemplateServerId as unknown as ReturnType<typeof v.id<"workOrderDayTaskTemplates">>["type"])
      : undefined;
    const workOrderDayServiceId = args.workOrderDayServiceServerId
      ? (args.workOrderDayServiceServerId as unknown as ReturnType<typeof v.id<"workOrderDayServices">>["type"])
      : undefined;
    const serviceTaskTemplateId = args.serviceTaskTemplateServerId
      ? (args.serviceTaskTemplateServerId as unknown as ReturnType<typeof v.id<"serviceTaskTemplates">>["type"])
      : undefined;
    const taskTemplateId = args.taskTemplateServerId as unknown as ReturnType<
      typeof v.id<"taskTemplates">
    >["type"];

    if (existing) {
      await ctx.db.patch(existing._id, {
        instanceLabel: args.instanceLabel,
        status: args.status,
        startedAt: args.startedAt,
        completedAt: args.completedAt,
        updatedAt: args.updatedAt,
      });
      return { serverId: existing._id };
    }

    const id = await ctx.db.insert("taskInstances", {
      clientId: args.clientId,
      workOrderDayId,
      workOrderDayTaskTemplateId,
      workOrderDayServiceId,
      serviceTaskTemplateId,
      taskTemplateId,
      userId: args.userId,
      instanceLabel: args.instanceLabel,
      status: args.status,
      startedAt: args.startedAt,
      completedAt: args.completedAt,
      createdAt: args.createdAt,
      updatedAt: args.updatedAt,
    });
    return { serverId: id };
  },
});

export const upsertFieldResponse = mutation({
  args: {
    clientId: v.string(),
    taskInstanceServerId: v.optional(v.string()),
    taskInstanceClientId: v.string(),
    fieldTemplateServerId: v.string(),
    value: v.optional(v.string()),
    userId: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  },
  returns: v.object({
    serverId: v.string(),
  }),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("fieldResponses")
      .withIndex("by_client_id", (q) => q.eq("clientId", args.clientId))
      .unique();

    const fieldTemplateId = args.fieldTemplateServerId as unknown as ReturnType<
      typeof v.id<"fieldTemplates">
    >["type"];

    if (existing) {
      await ctx.db.patch(existing._id, {
        value: args.value,
        updatedAt: args.updatedAt,
      });
      return { serverId: existing._id };
    }

    let taskInstanceId;
    if (args.taskInstanceServerId) {
      taskInstanceId = args.taskInstanceServerId as unknown as ReturnType<
        typeof v.id<"taskInstances">
      >["type"];
    } else {
      const taskInstance = await ctx.db
        .query("taskInstances")
        .withIndex("by_client_id", (q) => q.eq("clientId", args.taskInstanceClientId))
        .unique();

      if (!taskInstance) {
        throw new Error("Task instance not found for clientId: " + args.taskInstanceClientId);
      }
      taskInstanceId = taskInstance._id;
    }

    const id = await ctx.db.insert("fieldResponses", {
      clientId: args.clientId,
      taskInstanceId,
      taskInstanceClientId: args.taskInstanceClientId,
      fieldTemplateId,
      value: args.value,
      userId: args.userId,
      createdAt: args.createdAt,
      updatedAt: args.updatedAt,
    });
    return { serverId: id };
  },
});

const fieldTemplateValidator = v.object({
  fieldTemplateServerId: v.string(),
  label: v.string(),
  fieldType: v.string(),
  order: v.number(),
  isRequired: v.boolean(),
  defaultValue: v.optional(v.string()),
  placeholder: v.optional(v.string()),
  subheader: v.optional(v.string()),
  displayStyle: v.optional(v.string()),
  conditionLogic: v.optional(v.union(v.literal("AND"), v.literal("OR"), v.null())),
});

const taskTemplateInfoValidator = v.object({
  serviceTaskTemplateServerId: v.optional(v.string()),
  dayTaskTemplateServerId: v.optional(v.string()),
  taskTemplateServerId: v.string(),
  taskTemplateName: v.string(),
  description: v.optional(v.string()),
  readme: v.optional(v.string()),
  order: v.number(),
  isRequired: v.boolean(),
  isRepeatable: v.boolean(),
  fields: v.array(fieldTemplateValidator),
});

export const getAssignmentsForUser = query({
  args: { clerkUserId: v.string() },
  returns: v.array(
    v.object({
      workOrderDayServerId: v.string(),
      workOrderServerId: v.string(),
      workOrderName: v.string(),
      customerName: v.string(),
      faenaName: v.string(),
      dayDate: v.number(),
      dayNumber: v.number(),
      status: v.string(),
      routines: v.array(
        v.object({
          workOrderDayServiceServerId: v.string(),
          serviceServerId: v.string(),
          serviceName: v.string(),
          order: v.number(),
          tasks: v.array(taskTemplateInfoValidator),
        })
      ),
      standaloneTasks: v.array(taskTemplateInfoValidator),
      orphanedTasks: v.array(
        v.object({
          taskInstanceServerId: v.string(),
          taskInstanceClientId: v.string(),
          taskTemplateServerId: v.string(),
          taskTemplateName: v.string(),
          orphanedAt: v.number(),
          status: v.string(),
        })
      ),
    })
  ),
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkUserId))
      .unique();

    if (!user) {
      return [];
    }

    const assignments = await ctx.db
      .query("workOrderDayAssignments")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const results = await Promise.all(
      assignments.map(async (assignment) => {
        const day = await ctx.db.get(assignment.workOrderDayId);
        if (!day) return null;

        const workOrder = await ctx.db.get(day.workOrderId);
        if (!workOrder) return null;

        const customer = await ctx.db.get(workOrder.customerId);
        const faena = await ctx.db.get(workOrder.faenaId);

        const dayServices = await ctx.db
          .query("workOrderDayServices")
          .withIndex("by_work_order_day", (q) => q.eq("workOrderDayId", day._id))
          .collect();

        const routines = await Promise.all(
          dayServices.map(async (ds) => {
            const service = await ctx.db.get(ds.serviceId);

            const serviceTaskTemplates = await ctx.db
              .query("serviceTaskTemplates")
              .withIndex("by_service", (q) => q.eq("serviceId", ds.serviceId))
              .collect();

            const applicableTasks = serviceTaskTemplates.filter(
              (t) => t.dayNumber === undefined || t.dayNumber === day.dayNumber
            );

            const tasks = await Promise.all(
              applicableTasks.map(async (stt) => {
                const template = await ctx.db.get(stt.taskTemplateId);

                const fieldTemplates = await ctx.db
                  .query("fieldTemplates")
                  .withIndex("by_task_template", (q) => q.eq("taskTemplateId", stt.taskTemplateId))
                  .collect();

                return {
                  serviceTaskTemplateServerId: stt._id as string,
                  dayTaskTemplateServerId: undefined,
                  taskTemplateServerId: stt.taskTemplateId as string,
                  taskTemplateName: template?.name ?? "Unknown",
                  description: template?.description,
                  readme: template?.readme,
                  order: stt.order,
                  isRequired: stt.isRequired,
                  isRepeatable: template?.isRepeatable ?? false,
                  fields: fieldTemplates
                    .sort((a, b) => a.order - b.order)
                    .map((f) => ({
                      fieldTemplateServerId: f._id as string,
                      label: f.label,
                      fieldType: f.fieldType,
                      order: f.order,
                      isRequired: f.isRequired,
                      defaultValue: f.defaultValue,
                      placeholder: f.placeholder,
                      subheader: f.subheader,
                      displayStyle: f.displayStyle,
                      conditionLogic: f.conditionLogic,
                    })),
                };
              })
            );

            return {
              workOrderDayServiceServerId: ds._id as string,
              serviceServerId: ds.serviceId as string,
              serviceName: service?.name ?? "Unknown",
              order: ds.order,
              tasks: tasks.sort((a, b) => a.order - b.order),
            };
          })
        );

        const standaloneDayTaskTemplates = await ctx.db
          .query("workOrderDayTaskTemplates")
          .withIndex("by_work_order_day", (q) => q.eq("workOrderDayId", day._id))
          .collect();

        const standaloneTasks = await Promise.all(
          standaloneDayTaskTemplates.map(async (dtt) => {
            const template = await ctx.db.get(dtt.taskTemplateId);

            const fieldTemplates = await ctx.db
              .query("fieldTemplates")
              .withIndex("by_task_template", (q) => q.eq("taskTemplateId", dtt.taskTemplateId))
              .collect();

            return {
              serviceTaskTemplateServerId: undefined,
              dayTaskTemplateServerId: dtt._id as string,
              taskTemplateServerId: dtt.taskTemplateId as string,
              taskTemplateName: template?.name ?? "Unknown",
              description: template?.description,
              readme: template?.readme,
              order: dtt.order,
              isRequired: dtt.isRequired,
              isRepeatable: template?.isRepeatable ?? false,
              fields: fieldTemplates
                .sort((a, b) => a.order - b.order)
                .map((f) => ({
                  fieldTemplateServerId: f._id as string,
                  label: f.label,
                  fieldType: f.fieldType,
                  order: f.order,
                  isRequired: f.isRequired,
                  defaultValue: f.defaultValue,
                  placeholder: f.placeholder,
                  subheader: f.subheader,
                  displayStyle: f.displayStyle,
                  conditionLogic: f.conditionLogic,
                })),
            };
          })
        );

        const allInstances = await ctx.db
          .query("taskInstances")
          .withIndex("by_work_order_day_and_user", (q) =>
            q.eq("workOrderDayId", day._id).eq("userId", args.clerkUserId)
          )
          .collect();

        const orphanedInstances = await getOrphanedInstances(ctx.db, allInstances);

        const orphanedTasks = await Promise.all(
          orphanedInstances.map(async (instance) => {
            const template = await ctx.db.get(instance.taskTemplateId);
            return {
              taskInstanceServerId: instance._id as string,
              taskInstanceClientId: instance.clientId,
              taskTemplateServerId: instance.taskTemplateId as string,
              taskTemplateName: template?.name ?? "Unknown",
              orphanedAt: instance.updatedAt,
              status: instance.status,
            };
          })
        );

        return {
          workOrderDayServerId: day._id as string,
          workOrderServerId: workOrder._id as string,
          workOrderName: workOrder.name,
          customerName: customer?.name ?? "Unknown",
          faenaName: faena?.name ?? "Unknown",
          dayDate: day.dayDate,
          dayNumber: day.dayNumber,
          status: day.status,
          routines: routines.sort((a, b) => a.order - b.order),
          standaloneTasks: standaloneTasks.sort((a, b) => a.order - b.order),
          orphanedTasks,
        };
      })
    );

    return results.filter((r): r is NonNullable<typeof r> => r !== null);
  },
});

export const upsertAttachment = mutation({
  args: {
    clientId: v.string(),
    fieldResponseClientId: v.string(),
    storageId: v.optional(v.string()),
    fileName: v.string(),
    fileType: v.string(),
    mimeType: v.string(),
    fileSize: v.number(),
    userId: v.string(),
    uploadStatus: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  },
  returns: v.object({
    serverId: v.string(),
  }),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("attachments")
      .withIndex("by_client_id", (q) => q.eq("clientId", args.clientId))
      .unique();

    const storageId = args.storageId
      ? (args.storageId as unknown as ReturnType<typeof v.id<"_storage">>["type"])
      : undefined;

    if (existing) {
      await ctx.db.patch(existing._id, {
        storageId,
        fileName: args.fileName,
        fileType: args.fileType,
        mimeType: args.mimeType,
        fileSize: args.fileSize,
        uploadStatus: args.uploadStatus,
        updatedAt: args.updatedAt,
      });
      return { serverId: existing._id };
    }

    const fieldResponse = await ctx.db
      .query("fieldResponses")
      .withIndex("by_client_id", (q) => q.eq("clientId", args.fieldResponseClientId))
      .unique();

    const id = await ctx.db.insert("attachments", {
      clientId: args.clientId,
      fieldResponseId: fieldResponse?._id,
      fieldResponseClientId: args.fieldResponseClientId,
      storageId,
      fileName: args.fileName,
      fileType: args.fileType,
      mimeType: args.mimeType,
      fileSize: args.fileSize,
      userId: args.userId,
      uploadStatus: args.uploadStatus,
      createdAt: args.createdAt,
      updatedAt: args.updatedAt,
    });
    return { serverId: id };
  },
});

export const getTaskInstancesForUser = query({
  args: { clerkUserId: v.string() },
  returns: v.array(
    v.object({
      serverId: v.string(),
      clientId: v.string(),
      workOrderDayServerId: v.string(),
      dayTaskTemplateServerId: v.optional(v.string()),
      workOrderDayServiceServerId: v.optional(v.string()),
      serviceTaskTemplateServerId: v.optional(v.string()),
      taskTemplateServerId: v.string(),
      userId: v.string(),
      instanceLabel: v.optional(v.string()),
      status: v.string(),
      startedAt: v.optional(v.number()),
      completedAt: v.optional(v.number()),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const instances = await ctx.db
      .query("taskInstances")
      .withIndex("by_user", (q) => q.eq("userId", args.clerkUserId))
      .collect();

    const nonOrphanedInstances = await filterNonOrphanedInstances(ctx.db, instances);

    return nonOrphanedInstances.map((i) => ({
      serverId: i._id as string,
      clientId: i.clientId,
      workOrderDayServerId: i.workOrderDayId as string,
      dayTaskTemplateServerId: i.workOrderDayTaskTemplateId as string | undefined,
      workOrderDayServiceServerId: i.workOrderDayServiceId as string | undefined,
      serviceTaskTemplateServerId: i.serviceTaskTemplateId as string | undefined,
      taskTemplateServerId: i.taskTemplateId as string,
      userId: i.userId,
      instanceLabel: i.instanceLabel,
      status: i.status,
      startedAt: i.startedAt,
      completedAt: i.completedAt,
      createdAt: i.createdAt,
      updatedAt: i.updatedAt,
    }));
  },
});

export const getFieldResponsesForUser = query({
  args: { clerkUserId: v.string() },
  returns: v.array(
    v.object({
      serverId: v.string(),
      clientId: v.string(),
      taskInstanceClientId: v.string(),
      fieldTemplateServerId: v.string(),
      value: v.optional(v.string()),
      userId: v.string(),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const responses = await ctx.db
      .query("fieldResponses")
      .withIndex("by_user_and_updated", (q) => q.eq("userId", args.clerkUserId))
      .collect();

    return responses.map((r) => ({
      serverId: r._id as string,
      clientId: r.clientId,
      taskInstanceClientId: r.taskInstanceClientId,
      fieldTemplateServerId: r.fieldTemplateId as string,
      value: r.value,
      userId: r.userId,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  },
});

export const getAttachmentsForUser = query({
  args: { clerkUserId: v.string() },
  returns: v.array(
    v.object({
      serverId: v.string(),
      clientId: v.string(),
      fieldResponseClientId: v.string(),
      storageId: v.optional(v.string()),
      storageUrl: v.union(v.string(), v.null()),
      fileName: v.string(),
      fileType: v.string(),
      mimeType: v.string(),
      fileSize: v.number(),
      userId: v.string(),
      uploadStatus: v.string(),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const attachmentDocs = await ctx.db
      .query("attachments")
      .withIndex("by_user_and_updated", (q) => q.eq("userId", args.clerkUserId))
      .collect();

    return Promise.all(
      attachmentDocs.map(async (a) => ({
        serverId: a._id as string,
        clientId: a.clientId,
        fieldResponseClientId: a.fieldResponseClientId,
        storageId: a.storageId as string | undefined,
        storageUrl: a.storageId ? await ctx.storage.getUrl(a.storageId) : null,
        fileName: a.fileName,
        fileType: a.fileType,
        mimeType: a.mimeType,
        fileSize: a.fileSize,
        userId: a.userId,
        uploadStatus: a.uploadStatus,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
      }))
    );
  },
});

export const getUsers = query({
  args: {},
  returns: v.array(
    v.object({
      serverId: v.string(),
      fullName: v.optional(v.string()),
      email: v.string(),
      role: v.string(),
    })
  ),
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    return users.map((u) => ({
      serverId: u._id as string,
      fullName: u.fullName,
      email: u.email,
      role: u.role,
    }));
  },
});

export const getFieldConditionsForUser = query({
  args: { clerkUserId: v.string() },
  returns: v.array(
    v.object({
      serverId: v.string(),
      childFieldServerId: v.string(),
      parentFieldServerId: v.string(),
      operator: v.string(),
      value: v.union(v.string(), v.array(v.string())),
      conditionGroup: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkUserId))
      .unique();

    if (!user) {
      return [];
    }

    const assignments = await ctx.db
      .query("workOrderDayAssignments")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const taskTemplateIds = new Set<string>();

    for (const assignment of assignments) {
      const day = await ctx.db.get(assignment.workOrderDayId);
      if (!day) continue;

      const dayServices = await ctx.db
        .query("workOrderDayServices")
        .withIndex("by_work_order_day", (q) => q.eq("workOrderDayId", day._id))
        .collect();

      for (const ds of dayServices) {
        const serviceTaskTemplates = await ctx.db
          .query("serviceTaskTemplates")
          .withIndex("by_service", (q) => q.eq("serviceId", ds.serviceId))
          .collect();

        const applicable = serviceTaskTemplates.filter(
          (t) => t.dayNumber === undefined || t.dayNumber === day.dayNumber
        );

        for (const stt of applicable) {
          taskTemplateIds.add(stt.taskTemplateId as string);
        }
      }

      const standaloneTasks = await ctx.db
        .query("workOrderDayTaskTemplates")
        .withIndex("by_work_order_day", (q) => q.eq("workOrderDayId", day._id))
        .collect();

      for (const dtt of standaloneTasks) {
        taskTemplateIds.add(dtt.taskTemplateId as string);
      }
    }

    const fieldIds = new Set<string>();

    for (const taskTemplateId of taskTemplateIds) {
      const fieldTemplates = await ctx.db
        .query("fieldTemplates")
        .withIndex("by_task_template", (q) =>
          q.eq("taskTemplateId", taskTemplateId as ReturnType<typeof v.id<"taskTemplates">>["type"])
        )
        .collect();

      for (const field of fieldTemplates) {
        fieldIds.add(field._id as string);
      }
    }

    const conditions: Array<{
      serverId: string;
      childFieldServerId: string;
      parentFieldServerId: string;
      operator: string;
      value: string | string[];
      conditionGroup: number;
    }> = [];

    for (const fieldId of fieldIds) {
      const fieldConditions = await ctx.db
        .query("fieldConditions")
        .withIndex("by_child_field", (q) =>
          q.eq("childFieldId", fieldId as ReturnType<typeof v.id<"fieldTemplates">>["type"])
        )
        .collect();

      for (const c of fieldConditions) {
        conditions.push({
          serverId: c._id as string,
          childFieldServerId: c.childFieldId as string,
          parentFieldServerId: c.parentFieldId as string,
          operator: c.operator,
          value: c.value,
          conditionGroup: c.conditionGroup,
        });
      }
    }

    return conditions;
  },
});

export const getTaskDependenciesForUser = query({
  args: { clerkUserId: v.string() },
  returns: v.array(
    v.object({
      serverId: v.string(),
      dependentTaskServerId: v.string(),
      prerequisiteTaskServerId: v.string(),
      workOrderDayServerId: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkUserId))
      .unique();

    if (!user) {
      return [];
    }

    const assignments = await ctx.db
      .query("workOrderDayAssignments")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const dependencies: Array<{
      serverId: string;
      dependentTaskServerId: string;
      prerequisiteTaskServerId: string;
      workOrderDayServerId: string;
    }> = [];

    for (const assignment of assignments) {
      const dayDeps = await ctx.db
        .query("workOrderDayTaskDependencies")
        .withIndex("by_work_order_day", (q) => q.eq("workOrderDayId", assignment.workOrderDayId))
        .collect();

      for (const dep of dayDeps) {
        dependencies.push({
          serverId: dep._id as string,
          dependentTaskServerId: dep.workOrderDayTaskTemplateId as string,
          prerequisiteTaskServerId: dep.dependsOnWorkOrderDayTaskTemplateId as string,
          workOrderDayServerId: dep.workOrderDayId as string,
        });
      }
    }

    return dependencies;
  },
});

export const getLookupEntityTypes = query({
  args: {},
  returns: v.array(
    v.object({
      serverId: v.string(),
      name: v.string(),
      description: v.optional(v.string()),
      parentEntityTypeServerId: v.optional(v.string()),
      isActive: v.boolean(),
    })
  ),
  handler: async (ctx) => {
    const types = await ctx.db
      .query("lookupEntityTypes")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    return types.map((t) => ({
      serverId: t._id as string,
      name: t.name,
      description: t.description,
      parentEntityTypeServerId: t.parentEntityTypeId as string | undefined,
      isActive: t.isActive,
    }));
  },
});

export const getLookupEntities = query({
  args: {},
  returns: v.array(
    v.object({
      serverId: v.string(),
      entityTypeServerId: v.string(),
      value: v.string(),
      label: v.string(),
      parentEntityServerId: v.optional(v.string()),
      displayOrder: v.number(),
      isActive: v.boolean(),
    })
  ),
  handler: async (ctx) => {
    const activeTypes = await ctx.db
      .query("lookupEntityTypes")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    const activeTypeIds = new Set(activeTypes.map((t) => t._id));

    const allEntities = await ctx.db.query("lookupEntities").collect();

    return allEntities
      .filter((e) => e.isActive && activeTypeIds.has(e.entityTypeId))
      .map((e) => ({
        serverId: e._id as string,
        entityTypeServerId: e.entityTypeId as string,
        value: e.value,
        label: e.label,
        parentEntityServerId: e.parentEntityId as string | undefined,
        displayOrder: e.displayOrder,
        isActive: e.isActive,
      }));
  },
});

export const updateWorkOrderDayStatus = mutation({
  args: {
    workOrderDayServerId: v.string(),
    status: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const validStatuses = ["pending", "in_progress", "completed"];
    if (!validStatuses.includes(args.status)) {
      throw new Error(`Invalid status: ${args.status}`);
    }

    const workOrderDayId = args.workOrderDayServerId as Id<"workOrderDays">;
    const existing = await ctx.db.get(workOrderDayId);
    if (!existing) {
      return null;
    }
    await ctx.db.patch(workOrderDayId, {
      status: args.status,
      updatedAt: Date.now(),
    });
    return null;
  },
});
