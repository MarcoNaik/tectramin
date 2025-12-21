import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { eq } from "drizzle-orm";
import { db } from "../db/client";
import {
  workOrderDays,
  dayTaskTemplates,
  fieldTemplates,
} from "../db/schema";
import type {
  WorkOrderDay,
  DayTaskTemplate,
  FieldTemplate,
} from "../db/types";

export interface AssignmentWithTemplates extends WorkOrderDay {
  taskTemplates: (DayTaskTemplate & {
    fields: FieldTemplate[];
  })[];
}

export function useAssignments(userId: string) {
  const { data: assignments } = useLiveQuery(
    db
      .select()
      .from(workOrderDays)
      .where(eq(workOrderDays.userId, userId))
  );

  const { data: allTaskTemplates } = useLiveQuery(
    db.select().from(dayTaskTemplates)
  );

  const { data: allFieldTemplates } = useLiveQuery(
    db.select().from(fieldTemplates)
  );

  const enrichedAssignments: AssignmentWithTemplates[] = (
    assignments ?? []
  ).map((assignment) => {
    const templates = (allTaskTemplates ?? [])
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
      taskTemplates: templates,
    };
  });

  return {
    assignments: enrichedAssignments,
  };
}

export function useAssignment(workOrderDayServerId: string) {
  const { data: assignment } = useLiveQuery(
    db
      .select()
      .from(workOrderDays)
      .where(eq(workOrderDays.serverId, workOrderDayServerId))
      .limit(1)
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

  if (!assignment?.[0]) {
    return { assignment: null };
  }

  const templates = (taskTemplatesList ?? [])
    .sort((a, b) => a.order - b.order)
    .map((tt) => ({
      ...tt,
      fields: (allFieldTemplates ?? [])
        .filter((f) => f.taskTemplateServerId === tt.taskTemplateServerId)
        .sort((a, b) => a.order - b.order),
    }));

  const enrichedAssignment: AssignmentWithTemplates = {
    ...assignment[0],
    taskTemplates: templates,
  };

  return {
    assignment: enrichedAssignment,
  };
}
