import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { eq, and } from "drizzle-orm";
import { db } from "../db/client";
import {
  workOrderDays,
  workOrderDayServices,
  dayTaskTemplates,
  fieldTemplates,
  taskInstances,
} from "../db/schema";
import type {
  WorkOrderDay,
  WorkOrderDayService,
  DayTaskTemplate,
  FieldTemplate,
  TaskInstance,
} from "../db/types";

export interface TaskTemplateWithFields extends DayTaskTemplate {
  fields: FieldTemplate[];
}

export interface RoutineWithTasks extends WorkOrderDayService {
  tasks: TaskTemplateWithFields[];
}

export interface OrphanedTaskInfo {
  taskInstance: TaskInstance;
  taskTemplate: DayTaskTemplate | null;
  fields: FieldTemplate[];
}

export interface AssignmentWithTemplates extends WorkOrderDay {
  routines: RoutineWithTasks[];
  standaloneTasks: TaskTemplateWithFields[];
  orphanedTasks: OrphanedTaskInfo[];
  taskTemplates: TaskTemplateWithFields[];
}

export function useAssignments(userId: string) {
  const { data: assignments } = useLiveQuery(
    db
      .select()
      .from(workOrderDays)
      .where(eq(workOrderDays.userId, userId))
  );

  const { data: allServices } = useLiveQuery(
    db.select().from(workOrderDayServices)
  );

  const { data: allTaskTemplates } = useLiveQuery(
    db.select().from(dayTaskTemplates)
  );

  const { data: allFieldTemplates } = useLiveQuery(
    db.select().from(fieldTemplates)
  );

  const { data: allTaskInstances } = useLiveQuery(
    db.select().from(taskInstances).where(eq(taskInstances.userId, userId))
  );

  const enrichedAssignments: AssignmentWithTemplates[] = (
    assignments ?? []
  ).map((assignment) => {
    const dayServices = (allServices ?? [])
      .filter((s) => s.workOrderDayServerId === assignment.serverId)
      .sort((a, b) => a.order - b.order);

    const routines: RoutineWithTasks[] = dayServices.map((service) => {
      const routineTasks = (allTaskTemplates ?? [])
        .filter(
          (tt) =>
            tt.workOrderDayServerId === assignment.serverId &&
            tt.workOrderDayServiceServerId === service.serverId
        )
        .sort((a, b) => a.order - b.order)
        .map((tt) => ({
          ...tt,
          fields: (allFieldTemplates ?? [])
            .filter((f) => f.taskTemplateServerId === tt.taskTemplateServerId)
            .sort((a, b) => a.order - b.order),
        }));

      return {
        ...service,
        tasks: routineTasks,
      };
    });

    const standaloneTasks = (allTaskTemplates ?? [])
      .filter(
        (tt) =>
          tt.workOrderDayServerId === assignment.serverId &&
          tt.workOrderDayServiceServerId === null
      )
      .sort((a, b) => a.order - b.order)
      .map((tt) => ({
        ...tt,
        fields: (allFieldTemplates ?? [])
          .filter((f) => f.taskTemplateServerId === tt.taskTemplateServerId)
          .sort((a, b) => a.order - b.order),
      }));

    const orphanedInstances = (allTaskInstances ?? []).filter((ti) => {
      if (ti.workOrderDayServerId !== assignment.serverId) return false;

      if (ti.workOrderDayServiceServerId) {
        const routineExists = dayServices.some(
          (s) => s.serverId === ti.workOrderDayServiceServerId
        );
        if (!routineExists) return true;

        if (ti.serviceTaskTemplateServerId) {
          const taskInRoutineExists = (allTaskTemplates ?? []).some(
            (tt) => tt.serviceTaskTemplateServerId === ti.serviceTaskTemplateServerId
          );
          return !taskInRoutineExists;
        }
        return false;
      }

      if (ti.dayTaskTemplateServerId) {
        return !(allTaskTemplates ?? []).some(
          (tt) => tt.dayTaskTemplateServerId === ti.dayTaskTemplateServerId
        );
      }

      return true;
    });

    const orphanedTasks: OrphanedTaskInfo[] = orphanedInstances.map((ti) => {
      const taskTemplate =
        (allTaskTemplates ?? []).find(
          (tt) => tt.taskTemplateServerId === ti.taskTemplateServerId
        ) ?? null;
      const fields = taskTemplate
        ? (allFieldTemplates ?? [])
            .filter(
              (f) => f.taskTemplateServerId === taskTemplate.taskTemplateServerId
            )
            .sort((a, b) => a.order - b.order)
        : [];

      return {
        taskInstance: ti,
        taskTemplate,
        fields,
      };
    });

    const allTemplates = (allTaskTemplates ?? [])
      .filter((tt) => tt.workOrderDayServerId === assignment.serverId)
      .sort((a, b) => a.order - b.order)
      .map((tt) => ({
        ...tt,
        fields: (allFieldTemplates ?? [])
          .filter((f) => f.taskTemplateServerId === tt.taskTemplateServerId)
          .sort((a, b) => a.order - b.order),
      }));

    return {
      ...assignment,
      routines,
      standaloneTasks,
      orphanedTasks,
      taskTemplates: allTemplates,
    };
  });

  return {
    assignments: enrichedAssignments,
  };
}

export function useAssignment(workOrderDayServerId: string, userId: string) {
  const { data: assignment } = useLiveQuery(
    db
      .select()
      .from(workOrderDays)
      .where(eq(workOrderDays.serverId, workOrderDayServerId))
      .limit(1)
  );

  const { data: dayServices } = useLiveQuery(
    db
      .select()
      .from(workOrderDayServices)
      .where(eq(workOrderDayServices.workOrderDayServerId, workOrderDayServerId))
  );

  const { data: taskTemplatesList } = useLiveQuery(
    db
      .select()
      .from(dayTaskTemplates)
      .where(eq(dayTaskTemplates.workOrderDayServerId, workOrderDayServerId))
  );

  const { data: allFieldTemplates } = useLiveQuery(
    db.select().from(fieldTemplates)
  );

  const { data: allInstances } = useLiveQuery(
    db
      .select()
      .from(taskInstances)
      .where(
        and(
          eq(taskInstances.workOrderDayServerId, workOrderDayServerId),
          eq(taskInstances.userId, userId)
        )
      )
  );

  if (!assignment?.[0]) {
    return { assignment: null };
  }

  const routines: RoutineWithTasks[] = (dayServices ?? [])
    .sort((a, b) => a.order - b.order)
    .map((service) => {
      const routineTasks = (taskTemplatesList ?? [])
        .filter(
          (tt) =>
            tt.workOrderDayServiceServerId === service.serverId
        )
        .sort((a, b) => a.order - b.order)
        .map((tt) => ({
          ...tt,
          fields: (allFieldTemplates ?? [])
            .filter((f) => f.taskTemplateServerId === tt.taskTemplateServerId)
            .sort((a, b) => a.order - b.order),
        }));

      return {
        ...service,
        tasks: routineTasks,
      };
    });

  const standaloneTasks = (taskTemplatesList ?? [])
    .filter((tt) => tt.workOrderDayServiceServerId === null)
    .sort((a, b) => a.order - b.order)
    .map((tt) => ({
      ...tt,
      fields: (allFieldTemplates ?? [])
        .filter((f) => f.taskTemplateServerId === tt.taskTemplateServerId)
        .sort((a, b) => a.order - b.order),
    }));

  const orphanedInstances = (allInstances ?? []).filter((ti) => {
    if (ti.workOrderDayServiceServerId) {
      const routineExists = (dayServices ?? []).some(
        (s) => s.serverId === ti.workOrderDayServiceServerId
      );
      if (!routineExists) return true;

      if (ti.serviceTaskTemplateServerId) {
        const taskInRoutineExists = (taskTemplatesList ?? []).some(
          (tt) => tt.serviceTaskTemplateServerId === ti.serviceTaskTemplateServerId
        );
        return !taskInRoutineExists;
      }
      return false;
    }

    if (ti.dayTaskTemplateServerId) {
      return !(taskTemplatesList ?? []).some(
        (tt) => tt.dayTaskTemplateServerId === ti.dayTaskTemplateServerId
      );
    }

    return true;
  });

  const orphanedTasks: OrphanedTaskInfo[] = orphanedInstances.map((ti) => {
    const taskTemplate =
      (taskTemplatesList ?? []).find(
        (tt) => tt.taskTemplateServerId === ti.taskTemplateServerId
      ) ?? null;
    const fields = taskTemplate
      ? (allFieldTemplates ?? [])
          .filter(
            (f) => f.taskTemplateServerId === taskTemplate.taskTemplateServerId
          )
          .sort((a, b) => a.order - b.order)
      : [];

    return {
      taskInstance: ti,
      taskTemplate,
      fields,
    };
  });

  const allTemplates = (taskTemplatesList ?? [])
    .sort((a, b) => a.order - b.order)
    .map((tt) => ({
      ...tt,
      fields: (allFieldTemplates ?? [])
        .filter((f) => f.taskTemplateServerId === tt.taskTemplateServerId)
        .sort((a, b) => a.order - b.order),
    }));

  const enrichedAssignment: AssignmentWithTemplates = {
    ...assignment[0],
    routines,
    standaloneTasks,
    orphanedTasks,
    taskTemplates: allTemplates,
  };

  return {
    assignment: enrichedAssignment,
  };
}
