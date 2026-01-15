import { useMemo } from "react";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { db } from "../db/client";
import { taskInstances, fieldResponses } from "../db/schema";
import type { TaskInstance, FieldResponse } from "../db/types";
import type { SelectOption } from "../types/select";

export interface TaskInstanceSelectConfig {
  sourceTaskTemplateId?: string;
  displayFieldTemplateId?: string;
}

export function parseTaskInstanceSelectConfig(displayStyle: string | null | undefined): TaskInstanceSelectConfig {
  if (!displayStyle) return {};
  try {
    const parsed = JSON.parse(displayStyle);
    if (typeof parsed === "object" && parsed !== null) {
      return parsed as TaskInstanceSelectConfig;
    }
    return {};
  } catch {
    return {};
  }
}

export function useTaskInstanceSelectOptions(
  workOrderDayServerId: string | undefined,
  config: TaskInstanceSelectConfig
): SelectOption[] {
  const { data: allTaskInstances } = useLiveQuery(
    db.select().from(taskInstances)
  );

  const { data: allFieldResponses } = useLiveQuery(
    db.select().from(fieldResponses)
  );

  return useMemo(() => {
    if (!workOrderDayServerId || !config.sourceTaskTemplateId) {
      return [];
    }

    const instances = (allTaskInstances ?? []) as TaskInstance[];
    const responses = (allFieldResponses ?? []) as FieldResponse[];

    const filteredInstances = instances.filter(
      (ti) =>
        ti.workOrderDayServerId === workOrderDayServerId &&
        ti.taskTemplateServerId === config.sourceTaskTemplateId &&
        ti.status === "completed"
    );

    return filteredInstances.map((instance) => {
      let label = instance.instanceLabel || `Instancia ${instance.clientId.slice(0, 8)}`;

      if (config.displayFieldTemplateId) {
        const displayResponse = responses.find(
          (r) =>
            r.taskInstanceClientId === instance.clientId &&
            r.fieldTemplateServerId === config.displayFieldTemplateId
        );
        if (displayResponse?.value) {
          label = displayResponse.value;
        }
      }

      return {
        value: instance.clientId,
        label,
      };
    });
  }, [workOrderDayServerId, config.sourceTaskTemplateId, config.displayFieldTemplateId, allTaskInstances, allFieldResponses]);
}
