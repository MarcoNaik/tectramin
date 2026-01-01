import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";

const workOrderValidator = v.object({
  _id: v.id("workOrders"),
  _creationTime: v.number(),
  customerId: v.id("customers"),
  faenaId: v.id("faenas"),
  serviceId: v.optional(v.id("services")),
  name: v.string(),
  status: v.string(),
  startDate: v.number(),
  endDate: v.number(),
  notes: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
});

export const list = query({
  args: {},
  returns: v.array(workOrderValidator),
  handler: async (ctx) => {
    return await ctx.db.query("workOrders").collect();
  },
});

export const listByCustomer = query({
  args: { customerId: v.id("customers") },
  returns: v.array(workOrderValidator),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("workOrders")
      .withIndex("by_customer", (q) => q.eq("customerId", args.customerId))
      .collect();
  },
});

export const listByFaena = query({
  args: { faenaId: v.id("faenas") },
  returns: v.array(workOrderValidator),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("workOrders")
      .withIndex("by_faena", (q) => q.eq("faenaId", args.faenaId))
      .collect();
  },
});

export const listByStatus = query({
  args: { status: v.string() },
  returns: v.array(workOrderValidator),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("workOrders")
      .withIndex("by_status", (q) => q.eq("status", args.status))
      .collect();
  },
});

export const listByDateRange = query({
  args: {
    startDate: v.number(),
    endDate: v.number(),
  },
  returns: v.array(workOrderValidator),
  handler: async (ctx, args) => {
    const workOrders = await ctx.db.query("workOrders").collect();
    return workOrders.filter(
      (wo) => wo.startDate <= args.endDate && wo.endDate >= args.startDate
    );
  },
});

export const get = query({
  args: { id: v.id("workOrders") },
  returns: v.union(workOrderValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getWithDetails = query({
  args: { id: v.id("workOrders") },
  returns: v.union(
    v.object({
      workOrder: workOrderValidator,
      customer: v.object({
        _id: v.id("customers"),
        name: v.string(),
      }),
      faena: v.object({
        _id: v.id("faenas"),
        name: v.string(),
      }),
      service: v.optional(
        v.object({
          _id: v.id("services"),
          name: v.string(),
        })
      ),
      days: v.array(
        v.object({
          _id: v.id("workOrderDays"),
          dayDate: v.number(),
          dayNumber: v.number(),
          status: v.string(),
          requiredPeople: v.optional(v.number()),
          assignmentCount: v.number(),
          taskCount: v.number(),
          completedTaskCount: v.number(),
          assignments: v.array(
            v.object({
              _id: v.id("workOrderDayAssignments"),
              userId: v.id("users"),
              userFullName: v.optional(v.string()),
              userEmail: v.string(),
            })
          ),
        })
      ),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const workOrder = await ctx.db.get(args.id);
    if (!workOrder) {
      return null;
    }

    const customer = await ctx.db.get(workOrder.customerId);
    if (!customer) {
      return null;
    }

    const faena = await ctx.db.get(workOrder.faenaId);
    if (!faena) {
      return null;
    }

    let service = undefined;
    if (workOrder.serviceId) {
      const s = await ctx.db.get(workOrder.serviceId);
      if (s) {
        service = { _id: s._id, name: s.name };
      }
    }

    const days = await ctx.db
      .query("workOrderDays")
      .withIndex("by_work_order", (q) => q.eq("workOrderId", args.id))
      .collect();

    const daysWithCounts = await Promise.all(
      days.map(async (day) => {
        const assignments = await ctx.db
          .query("workOrderDayAssignments")
          .withIndex("by_work_order_day", (q) => q.eq("workOrderDayId", day._id))
          .collect();

        const taskInstances = await ctx.db
          .query("taskInstances")
          .withIndex("by_work_order_day", (q) => q.eq("workOrderDayId", day._id))
          .collect();

        const taskTemplates = await ctx.db
          .query("workOrderDayTaskTemplates")
          .withIndex("by_work_order_day", (q) => q.eq("workOrderDayId", day._id))
          .collect();

        const assignmentDetails = await Promise.all(
          assignments.map(async (a) => {
            const user = await ctx.db.get(a.userId);
            return {
              _id: a._id,
              userId: a.userId,
              userFullName: user?.fullName,
              userEmail: user?.email ?? "Unknown",
            };
          })
        );

        return {
          _id: day._id,
          dayDate: day.dayDate,
          dayNumber: day.dayNumber,
          status: day.status,
          requiredPeople: day.requiredPeople,
          assignmentCount: assignments.length,
          taskCount: taskTemplates.length,
          completedTaskCount: taskInstances.filter((t) => t.status === "completed").length,
          assignments: assignmentDetails,
        };
      })
    );

    return {
      workOrder,
      customer: { _id: customer._id, name: customer.name },
      faena: { _id: faena._id, name: faena.name },
      service,
      days: daysWithCounts.sort((a, b) => a.dayNumber - b.dayNumber),
    };
  },
});

export const create = mutation({
  args: {
    customerId: v.id("customers"),
    faenaId: v.id("faenas"),
    serviceId: v.optional(v.id("services")),
    name: v.string(),
    startDate: v.number(),
    endDate: v.number(),
    requiredPeoplePerDay: v.number(),
    notes: v.optional(v.string()),
  },
  returns: v.id("workOrders"),
  handler: async (ctx, args) => {
    const customer = await ctx.db.get(args.customerId);
    if (!customer) {
      throw new Error("Customer not found");
    }

    const faena = await ctx.db.get(args.faenaId);
    if (!faena) {
      throw new Error("Faena not found");
    }

    if (faena.customerId !== args.customerId) {
      throw new Error("Faena does not belong to customer");
    }

    if (args.serviceId) {
      const service = await ctx.db.get(args.serviceId);
      if (!service) {
        throw new Error("Service not found");
      }
    }

    if (args.startDate > args.endDate) {
      throw new Error("Start date must be before end date");
    }

    const now = Date.now();

    const workOrderId = await ctx.db.insert("workOrders", {
      customerId: args.customerId,
      faenaId: args.faenaId,
      serviceId: args.serviceId,
      name: args.name,
      status: "draft",
      startDate: args.startDate,
      endDate: args.endDate,
      notes: args.notes,
      createdAt: now,
      updatedAt: now,
    });

    const startDay = new Date(args.startDate);
    startDay.setHours(0, 0, 0, 0);
    const endDay = new Date(args.endDate);
    endDay.setHours(0, 0, 0, 0);

    let dayNumber = 1;
    const currentDay = new Date(startDay);

    while (currentDay <= endDay) {
      await ctx.db.insert("workOrderDays", {
        workOrderId,
        dayDate: currentDay.getTime(),
        dayNumber,
        status: "pending",
        requiredPeople: args.requiredPeoplePerDay,
        createdAt: now,
        updatedAt: now,
      });

      currentDay.setDate(currentDay.getDate() + 1);
      dayNumber++;
    }

    if (args.serviceId) {
      const serviceTaskTemplates = await ctx.db
        .query("serviceTaskTemplates")
        .withIndex("by_service", (q) => q.eq("serviceId", args.serviceId!))
        .collect();

      const days = await ctx.db
        .query("workOrderDays")
        .withIndex("by_work_order", (q) => q.eq("workOrderId", workOrderId))
        .collect();

      for (const stt of serviceTaskTemplates) {
        const targetDays =
          stt.dayNumber !== undefined
            ? days.filter((d) => d.dayNumber === stt.dayNumber)
            : days;

        for (const day of targetDays) {
          await ctx.db.insert("workOrderDayTaskTemplates", {
            workOrderDayId: day._id,
            taskTemplateId: stt.taskTemplateId,
            order: stt.order,
            isRequired: stt.isRequired,
          });
        }
      }
    }

    return workOrderId;
  },
});

export const createFromService = mutation({
  args: {
    serviceId: v.id("services"),
    customerId: v.id("customers"),
    faenaId: v.id("faenas"),
    startDate: v.number(),
    endDate: v.number(),
    requiredPeoplePerDay: v.number(),
    name: v.optional(v.string()),
  },
  returns: v.id("workOrders"),
  handler: async (ctx, args) => {
    const service = await ctx.db.get(args.serviceId);
    if (!service) {
      throw new Error("Service not found");
    }

    const customer = await ctx.db.get(args.customerId);
    if (!customer) {
      throw new Error("Customer not found");
    }

    const faena = await ctx.db.get(args.faenaId);
    if (!faena) {
      throw new Error("Faena not found");
    }

    if (faena.customerId !== args.customerId) {
      throw new Error("Faena does not belong to customer");
    }

    const startDate = new Date(args.startDate);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(args.endDate);
    endDate.setHours(0, 0, 0, 0);

    const dayCount = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    const now = Date.now();

    const workOrderId = await ctx.db.insert("workOrders", {
      customerId: args.customerId,
      faenaId: args.faenaId,
      serviceId: args.serviceId,
      name: args.name ?? `${service.name} - ${customer.name}`,
      status: "draft",
      startDate: startDate.getTime(),
      endDate: endDate.getTime(),
      createdAt: now,
      updatedAt: now,
    });

    for (let i = 0; i < dayCount; i++) {
      const dayDate = new Date(startDate);
      dayDate.setDate(dayDate.getDate() + i);

      await ctx.db.insert("workOrderDays", {
        workOrderId,
        dayDate: dayDate.getTime(),
        dayNumber: i + 1,
        status: "pending",
        requiredPeople: args.requiredPeoplePerDay,
        createdAt: now,
        updatedAt: now,
      });
    }

    const serviceTaskTemplates = await ctx.db
      .query("serviceTaskTemplates")
      .withIndex("by_service", (q) => q.eq("serviceId", args.serviceId))
      .collect();

    const days = await ctx.db
      .query("workOrderDays")
      .withIndex("by_work_order", (q) => q.eq("workOrderId", workOrderId))
      .collect();

    const taskMapping = new Map<
      Id<"serviceTaskTemplates">,
      Array<{ wodtId: Id<"workOrderDayTaskTemplates">; dayId: Id<"workOrderDays"> }>
    >();

    for (const stt of serviceTaskTemplates) {
      const targetDays =
        stt.dayNumber !== undefined
          ? days.filter((d) => d.dayNumber === stt.dayNumber)
          : days;

      const mappings: Array<{ wodtId: Id<"workOrderDayTaskTemplates">; dayId: Id<"workOrderDays"> }> = [];

      for (const day of targetDays) {
        const wodtId = await ctx.db.insert("workOrderDayTaskTemplates", {
          workOrderDayId: day._id,
          taskTemplateId: stt.taskTemplateId,
          order: stt.order,
          isRequired: stt.isRequired,
        });
        mappings.push({ wodtId, dayId: day._id });
      }

      taskMapping.set(stt._id, mappings);
    }

    const serviceDependencies = await ctx.db
      .query("serviceTaskDependencies")
      .withIndex("by_service", (q) => q.eq("serviceId", args.serviceId))
      .collect();

    for (const dep of serviceDependencies) {
      const dependentMappings = taskMapping.get(dep.serviceTaskTemplateId) ?? [];
      const prereqMappings = taskMapping.get(dep.dependsOnServiceTaskTemplateId) ?? [];

      for (const depMapping of dependentMappings) {
        for (const prereqMapping of prereqMappings) {
          if (depMapping.dayId === prereqMapping.dayId) {
            await ctx.db.insert("workOrderDayTaskDependencies", {
              workOrderDayTaskTemplateId: depMapping.wodtId,
              dependsOnWorkOrderDayTaskTemplateId: prereqMapping.wodtId,
              workOrderDayId: depMapping.dayId,
              createdAt: now,
            });
          }
        }
      }
    }

    return workOrderId;
  },
});

export const update = mutation({
  args: {
    id: v.id("workOrders"),
    name: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const filteredUpdates: Record<string, string | undefined> = {};

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

export const updateStatus = mutation({
  args: {
    id: v.id("workOrders"),
    status: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const validStatuses = ["draft", "scheduled", "in_progress", "completed", "cancelled"];
    if (!validStatuses.includes(args.status)) {
      throw new Error(`Invalid status. Must be one of: ${validStatuses.join(", ")}`);
    }

    await ctx.db.patch(args.id, {
      status: args.status,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const remove = mutation({
  args: { id: v.id("workOrders") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const workOrder = await ctx.db.get(args.id);
    if (!workOrder) {
      return null;
    }

    if (workOrder.status !== "draft" && workOrder.status !== "cancelled") {
      throw new Error("Can only delete draft or cancelled work orders");
    }

    const days = await ctx.db
      .query("workOrderDays")
      .withIndex("by_work_order", (q) => q.eq("workOrderId", args.id))
      .collect();

    for (const day of days) {
      const assignments = await ctx.db
        .query("workOrderDayAssignments")
        .withIndex("by_work_order_day", (q) => q.eq("workOrderDayId", day._id))
        .collect();

      for (const assignment of assignments) {
        await ctx.db.delete(assignment._id);
      }

      const taskTemplates = await ctx.db
        .query("workOrderDayTaskTemplates")
        .withIndex("by_work_order_day", (q) => q.eq("workOrderDayId", day._id))
        .collect();

      for (const tt of taskTemplates) {
        await ctx.db.delete(tt._id);
      }

      await ctx.db.delete(day._id);
    }

    await ctx.db.delete(args.id);
    return null;
  },
});
