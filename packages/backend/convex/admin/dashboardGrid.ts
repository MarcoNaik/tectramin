import { query } from "../_generated/server";
import { v } from "convex/values";

const assignedUserValidator = v.object({
  userId: v.id("users"),
  fullName: v.optional(v.string()),
  email: v.string(),
});

const taskDataValidator = v.object({
  linkId: v.id("workOrderDayTaskTemplates"),
  taskTemplateId: v.id("taskTemplates"),
  name: v.string(),
  isRequired: v.boolean(),
});

const workOrderDayGridValidator = v.object({
  _id: v.id("workOrderDays"),
  faenaId: v.id("faenas"),
  dayDate: v.number(),
  workOrderId: v.id("workOrders"),
  workOrderName: v.string(),
  workOrderStatus: v.string(),
  dayStatus: v.string(),
  dayNumber: v.number(),
  assignmentCount: v.number(),
  taskCount: v.number(),
  completedTaskCount: v.number(),
  assignedUsers: v.array(assignedUserValidator),
  tasks: v.array(taskDataValidator),
});

const faenaGridValidator = v.object({
  _id: v.id("faenas"),
  name: v.string(),
  customerName: v.string(),
  isActive: v.boolean(),
});

export const getGridData = query({
  args: {
    startDate: v.number(),
    endDate: v.number(),
  },
  returns: v.object({
    faenas: v.array(faenaGridValidator),
    workOrderDays: v.array(workOrderDayGridValidator),
  }),
  handler: async (ctx, args) => {
    const allFaenas = await ctx.db
      .query("faenas")
      .collect();

    const faenasWithCustomers = await Promise.all(
      allFaenas.map(async (faena) => {
        const customer = await ctx.db.get(faena.customerId);
        return {
          _id: faena._id,
          name: faena.name,
          customerName: customer?.name ?? "Unknown",
          isActive: faena.isActive,
        };
      })
    );

    const activeFaenas = faenasWithCustomers
      .filter((f) => f.isActive)
      .sort((a, b) => a.name.localeCompare(b.name));

    const startOfDay = new Date(args.startDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(args.endDate);
    endOfDay.setHours(23, 59, 59, 999);

    const allWorkOrderDays = await ctx.db
      .query("workOrderDays")
      .collect();

    const daysInRange = allWorkOrderDays.filter(
      (day) => day.dayDate >= startOfDay.getTime() && day.dayDate <= endOfDay.getTime()
    );

    const workOrderDaysWithDetails = await Promise.all(
      daysInRange.map(async (day) => {
        const workOrder = await ctx.db.get(day.workOrderId);
        if (!workOrder) return null;

        const faena = await ctx.db.get(workOrder.faenaId);
        if (!faena || !faena.isActive) return null;

        const assignments = await ctx.db
          .query("workOrderDayAssignments")
          .withIndex("by_work_order_day", (q) => q.eq("workOrderDayId", day._id))
          .collect();

        const assignedUsers = await Promise.all(
          assignments.map(async (assignment) => {
            const user = await ctx.db.get(assignment.userId);
            return {
              userId: assignment.userId,
              fullName: user?.fullName,
              email: user?.email ?? "",
            };
          })
        );

        const taskTemplateLinks = await ctx.db
          .query("workOrderDayTaskTemplates")
          .withIndex("by_work_order_day", (q) => q.eq("workOrderDayId", day._id))
          .collect();

        const tasks = await Promise.all(
          taskTemplateLinks.map(async (tt) => {
            const template = await ctx.db.get(tt.taskTemplateId);
            return {
              linkId: tt._id,
              taskTemplateId: tt.taskTemplateId,
              name: template?.name ?? "Unknown",
              isRequired: tt.isRequired,
            };
          })
        );

        const taskInstances = await ctx.db
          .query("taskInstances")
          .withIndex("by_work_order_day", (q) => q.eq("workOrderDayId", day._id))
          .collect();

        const completedTaskCount = taskInstances.filter(
          (ti) => ti.status === "completed"
        ).length;

        return {
          _id: day._id,
          faenaId: workOrder.faenaId,
          dayDate: day.dayDate,
          workOrderId: workOrder._id,
          workOrderName: workOrder.name,
          workOrderStatus: workOrder.status,
          dayStatus: day.status,
          dayNumber: day.dayNumber,
          assignmentCount: assignments.length,
          taskCount: tasks.length,
          completedTaskCount,
          assignedUsers,
          tasks,
        };
      })
    );

    const validWorkOrderDays = workOrderDaysWithDetails.filter(
      (day): day is NonNullable<typeof day> => day !== null
    );

    return {
      faenas: activeFaenas,
      workOrderDays: validWorkOrderDays,
    };
  },
});
