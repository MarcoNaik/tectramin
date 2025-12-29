import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { taskDependencies } from "../db/schema";
import type { TaskDependency, TaskInstance, DayTaskTemplate } from "../db/types";

export function useTaskDependencies(workOrderDayServerId: string) {
  const { data: dependencies } = useLiveQuery(
    db
      .select()
      .from(taskDependencies)
      .where(eq(taskDependencies.workOrderDayServerId, workOrderDayServerId))
  );

  return {
    dependencies: dependencies ?? [],
  };
}

export function useAllTaskDependencies() {
  const { data: dependencies } = useLiveQuery(
    db.select().from(taskDependencies)
  );

  return {
    dependencies: dependencies ?? [],
  };
}

export function usePrerequisiteStatus(
  dayTaskTemplateServerId: string,
  workOrderDayServerId: string,
  allTaskInstances: TaskInstance[],
  allDependencies: TaskDependency[],
  allTaskTemplates: DayTaskTemplate[]
): { canStart: boolean; blockingTasks: string[] } {
  const prereqs = allDependencies.filter(
    (d) =>
      d.dependentTaskServerId === dayTaskTemplateServerId &&
      d.workOrderDayServerId === workOrderDayServerId
  );

  if (prereqs.length === 0) {
    return { canStart: true, blockingTasks: [] };
  }

  const blockingTasks: string[] = [];
  for (const prereq of prereqs) {
    const instance = allTaskInstances.find(
      (ti) =>
        ti.dayTaskTemplateServerId === prereq.prerequisiteTaskServerId &&
        ti.status === "completed"
    );
    if (!instance) {
      const template = allTaskTemplates.find(
        (t) => t.serverId === prereq.prerequisiteTaskServerId
      );
      blockingTasks.push(template?.taskTemplateName ?? "Tarea desconocida");
    }
  }

  return { canStart: blockingTasks.length === 0, blockingTasks };
}
