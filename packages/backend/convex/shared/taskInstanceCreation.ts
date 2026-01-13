import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

interface RoutineTask {
  dayServiceId: Id<"workOrderDayServices">;
  serviceTaskTemplateId: Id<"serviceTaskTemplates">;
  taskTemplateId: Id<"taskTemplates">;
  name: string | undefined;
}

interface StandaloneTask {
  workOrderDayTaskTemplateId: Id<"workOrderDayTaskTemplates">;
  taskTemplateId: Id<"taskTemplates">;
  name: string | undefined;
}

interface ApplicableTasks {
  routineTasks: RoutineTask[];
  standaloneTasks: StandaloneTask[];
}

export async function getApplicableTasksForDay(
  ctx: MutationCtx,
  workOrderDayId: Id<"workOrderDays">
): Promise<ApplicableTasks> {
  const day = await ctx.db.get(workOrderDayId);
  if (!day) {
    throw new Error("Work order day not found");
  }

  const routineTasks: RoutineTask[] = [];

  const dayServices = await ctx.db
    .query("workOrderDayServices")
    .withIndex("by_work_order_day", (q) => q.eq("workOrderDayId", workOrderDayId))
    .filter((q) => q.neq(q.field("isActive"), false))
    .collect();

  for (const ds of dayServices) {
    const serviceTaskTemplates = await ctx.db
      .query("serviceTaskTemplates")
      .withIndex("by_service", (q) => q.eq("serviceId", ds.serviceId))
      .filter((q) => q.neq(q.field("isActive"), false))
      .collect();

    const applicable = serviceTaskTemplates.filter(
      (t) => t.dayNumber === undefined || t.dayNumber === day.dayNumber
    );

    for (const stt of applicable) {
      const taskTemplate = await ctx.db.get(stt.taskTemplateId);
      routineTasks.push({
        dayServiceId: ds._id,
        serviceTaskTemplateId: stt._id,
        taskTemplateId: stt.taskTemplateId,
        name: taskTemplate?.name,
      });
    }
  }

  const standaloneTasks: StandaloneTask[] = [];

  const dayTaskTemplates = await ctx.db
    .query("workOrderDayTaskTemplates")
    .withIndex("by_work_order_day", (q) => q.eq("workOrderDayId", workOrderDayId))
    .filter((q) => q.neq(q.field("isActive"), false))
    .collect();

  for (const dt of dayTaskTemplates) {
    const taskTemplate = await ctx.db.get(dt.taskTemplateId);
    standaloneTasks.push({
      workOrderDayTaskTemplateId: dt._id,
      taskTemplateId: dt.taskTemplateId,
      name: taskTemplate?.name,
    });
  }

  return { routineTasks, standaloneTasks };
}

export async function createTaskInstancesForUser(
  ctx: MutationCtx,
  workOrderDayId: Id<"workOrderDays">,
  clerkId: string,
  applicableTasks?: ApplicableTasks
): Promise<void> {
  const tasks = applicableTasks ?? await getApplicableTasksForDay(ctx, workOrderDayId);
  const now = Date.now();

  for (const rt of tasks.routineTasks) {
    const existingInstance = await ctx.db
      .query("taskInstances")
      .withIndex("by_work_order_day_and_user", (q) =>
        q.eq("workOrderDayId", workOrderDayId).eq("userId", clerkId)
      )
      .filter((q) => q.eq(q.field("serviceTaskTemplateId"), rt.serviceTaskTemplateId))
      .unique();

    if (!existingInstance) {
      const clientId = crypto.randomUUID();
      await ctx.db.insert("taskInstances", {
        clientId,
        workOrderDayId,
        workOrderDayServiceId: rt.dayServiceId,
        serviceTaskTemplateId: rt.serviceTaskTemplateId,
        taskTemplateId: rt.taskTemplateId,
        userId: clerkId,
        instanceLabel: rt.name,
        status: "draft",
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  for (const st of tasks.standaloneTasks) {
    const existingInstance = await ctx.db
      .query("taskInstances")
      .withIndex("by_work_order_day_and_user", (q) =>
        q.eq("workOrderDayId", workOrderDayId).eq("userId", clerkId)
      )
      .filter((q) => q.eq(q.field("workOrderDayTaskTemplateId"), st.workOrderDayTaskTemplateId))
      .unique();

    if (!existingInstance) {
      const clientId = crypto.randomUUID();
      await ctx.db.insert("taskInstances", {
        clientId,
        workOrderDayId,
        workOrderDayTaskTemplateId: st.workOrderDayTaskTemplateId,
        taskTemplateId: st.taskTemplateId,
        userId: clerkId,
        instanceLabel: st.name,
        status: "draft",
        createdAt: now,
        updatedAt: now,
      });
    }
  }
}

async function getAssignedUsersForDay(
  ctx: MutationCtx,
  workOrderDayId: Id<"workOrderDays">
): Promise<Array<{ oderId: Id<"users">; clerkId: string }>> {
  const assignments = await ctx.db
    .query("workOrderDayAssignments")
    .withIndex("by_work_order_day", (q) => q.eq("workOrderDayId", workOrderDayId))
    .collect();

  const users: Array<{ oderId: Id<"users">; clerkId: string }> = [];
  for (const assignment of assignments) {
    const user = await ctx.db.get(assignment.userId);
    if (user) {
      users.push({ oderId: user._id, clerkId: user.clerkId });
    }
  }
  return users;
}

export async function createInstancesForRoutineOnDay(
  ctx: MutationCtx,
  workOrderDayId: Id<"workOrderDays">,
  workOrderDayServiceId: Id<"workOrderDayServices">,
  serviceId: Id<"services">
): Promise<void> {
  const day = await ctx.db.get(workOrderDayId);
  if (!day) return;

  const serviceTaskTemplates = await ctx.db
    .query("serviceTaskTemplates")
    .withIndex("by_service", (q) => q.eq("serviceId", serviceId))
    .filter((q) => q.neq(q.field("isActive"), false))
    .collect();

  const applicable = serviceTaskTemplates.filter(
    (t) => t.dayNumber === undefined || t.dayNumber === day.dayNumber
  );

  const assignedUsers = await getAssignedUsersForDay(ctx, workOrderDayId);
  const now = Date.now();

  for (const user of assignedUsers) {
    for (const stt of applicable) {
      const existingInstance = await ctx.db
        .query("taskInstances")
        .withIndex("by_work_order_day_and_user", (q) =>
          q.eq("workOrderDayId", workOrderDayId).eq("userId", user.clerkId)
        )
        .filter((q) => q.eq(q.field("serviceTaskTemplateId"), stt._id))
        .unique();

      if (!existingInstance) {
        const taskTemplate = await ctx.db.get(stt.taskTemplateId);
        const clientId = crypto.randomUUID();
        await ctx.db.insert("taskInstances", {
          clientId,
          workOrderDayId,
          workOrderDayServiceId,
          serviceTaskTemplateId: stt._id,
          taskTemplateId: stt.taskTemplateId,
          userId: user.clerkId,
          instanceLabel: taskTemplate?.name,
          status: "draft",
          createdAt: now,
          updatedAt: now,
        });
      }
    }
  }
}

export async function createInstancesForStandaloneTaskOnDay(
  ctx: MutationCtx,
  workOrderDayId: Id<"workOrderDays">,
  workOrderDayTaskTemplateId: Id<"workOrderDayTaskTemplates">,
  taskTemplateId: Id<"taskTemplates">
): Promise<void> {
  const taskTemplate = await ctx.db.get(taskTemplateId);
  const assignedUsers = await getAssignedUsersForDay(ctx, workOrderDayId);
  const now = Date.now();

  for (const user of assignedUsers) {
    const existingInstance = await ctx.db
      .query("taskInstances")
      .withIndex("by_work_order_day_and_user", (q) =>
        q.eq("workOrderDayId", workOrderDayId).eq("userId", user.clerkId)
      )
      .filter((q) => q.eq(q.field("workOrderDayTaskTemplateId"), workOrderDayTaskTemplateId))
      .unique();

    if (!existingInstance) {
      const clientId = crypto.randomUUID();
      await ctx.db.insert("taskInstances", {
        clientId,
        workOrderDayId,
        workOrderDayTaskTemplateId,
        taskTemplateId,
        userId: user.clerkId,
        instanceLabel: taskTemplate?.name,
        status: "draft",
        createdAt: now,
        updatedAt: now,
      });
    }
  }
}

export async function createInstancesForNewRoutineTask(
  ctx: MutationCtx,
  serviceId: Id<"services">,
  serviceTaskTemplateId: Id<"serviceTaskTemplates">,
  taskTemplateId: Id<"taskTemplates">,
  dayNumber?: number
): Promise<void> {
  const taskTemplate = await ctx.db.get(taskTemplateId);

  const dayServices = await ctx.db
    .query("workOrderDayServices")
    .withIndex("by_service", (q) => q.eq("serviceId", serviceId))
    .filter((q) => q.neq(q.field("isActive"), false))
    .collect();

  const now = Date.now();

  for (const ds of dayServices) {
    const day = await ctx.db.get(ds.workOrderDayId);
    if (!day) continue;

    if (dayNumber !== undefined && dayNumber !== day.dayNumber) {
      continue;
    }

    const assignedUsers = await getAssignedUsersForDay(ctx, ds.workOrderDayId);

    for (const user of assignedUsers) {
      const existingInstance = await ctx.db
        .query("taskInstances")
        .withIndex("by_work_order_day_and_user", (q) =>
          q.eq("workOrderDayId", ds.workOrderDayId).eq("userId", user.clerkId)
        )
        .filter((q) => q.eq(q.field("serviceTaskTemplateId"), serviceTaskTemplateId))
        .unique();

      if (!existingInstance) {
        const clientId = crypto.randomUUID();
        await ctx.db.insert("taskInstances", {
          clientId,
          workOrderDayId: ds.workOrderDayId,
          workOrderDayServiceId: ds._id,
          serviceTaskTemplateId,
          taskTemplateId,
          userId: user.clerkId,
          instanceLabel: taskTemplate?.name,
          status: "draft",
          createdAt: now,
          updatedAt: now,
        });
      }
    }
  }
}
