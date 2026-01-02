import { useCallback } from "react";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { eq, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { db } from "../db/client";
import { taskInstances, fieldResponses } from "../db/schema";
import { addToQueue } from "../sync/SyncQueue";
import { syncService } from "../sync/SyncService";
import { networkMonitor } from "../sync/NetworkMonitor";
import { useConvex } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { TaskInstance, FieldResponse, TaskInstanceInput } from "../db/types";

export interface TaskInstanceWithResponses extends TaskInstance {
  responses: FieldResponse[];
}

export function useTaskInstances(userId: string) {
  const convex = useConvex();

  const { data: instances } = useLiveQuery(
    db
      .select()
      .from(taskInstances)
      .where(eq(taskInstances.userId, userId))
  );

  const { data: allResponses } = useLiveQuery(
    db.select().from(fieldResponses)
  );

  const enrichedInstances: TaskInstanceWithResponses[] = (instances ?? []).map(
    (instance) => ({
      ...instance,
      responses: (allResponses ?? []).filter(
        (r) => r.taskInstanceClientId === instance.clientId
      ),
    })
  );

  console.log("[useTaskInstances DEBUG] SQLite instances count:", instances?.length ?? 0);
  console.log("[useTaskInstances DEBUG] SQLite instances:", instances?.map(i => ({ clientId: i.clientId, label: i.instanceLabel, dayTaskTemplateServerId: i.dayTaskTemplateServerId })));

  const createTaskInstance = useCallback(
    async (input: TaskInstanceInput) => {
      const now = new Date();
      const clientId = uuidv4();

      const newInstance = {
        clientId,
        workOrderDayServerId: input.workOrderDayServerId,
        dayTaskTemplateServerId: input.dayTaskTemplateServerId,
        taskTemplateServerId: input.taskTemplateServerId,
        userId,
        instanceLabel: input.instanceLabel,
        status: "draft" as const,
        startedAt: now,
        createdAt: now,
        updatedAt: now,
        syncStatus: "pending" as const,
      };

      await db.insert(taskInstances).values(newInstance);

      const payload = {
        clientId,
        workOrderDayServerId: input.workOrderDayServerId,
        dayTaskTemplateServerId: input.dayTaskTemplateServerId,
        taskTemplateServerId: input.taskTemplateServerId,
        userId,
        instanceLabel: input.instanceLabel,
        status: "draft",
        startedAt: now.getTime(),
        createdAt: now.getTime(),
        updatedAt: now.getTime(),
      };

      if (networkMonitor.getIsOnline()) {
        try {
          const result = await convex.mutation(api.mobile.sync.upsertTaskInstance, payload);
          await db
            .update(taskInstances)
            .set({ serverId: result.serverId, syncStatus: "synced" })
            .where(eq(taskInstances.clientId, clientId));
        } catch {
          await addToQueue("taskInstances", "create", clientId, payload);
          await syncService.updatePendingCount();
        }
      } else {
        await addToQueue("taskInstances", "create", clientId, payload);
        await syncService.updatePendingCount();
      }

      return clientId;
    },
    [convex, userId]
  );

  const updateTaskInstanceStatus = useCallback(
    async (clientId: string, status: "draft" | "completed") => {
      const now = new Date();

      const instance = instances?.find((i) => i.clientId === clientId);
      if (!instance) return;

      const updates = {
        status,
        completedAt: status === "completed" ? now : undefined,
        updatedAt: now,
        syncStatus: "pending" as const,
      };

      await db
        .update(taskInstances)
        .set(updates)
        .where(eq(taskInstances.clientId, clientId));

      const payload = {
        clientId,
        workOrderDayServerId: instance.workOrderDayServerId,
        dayTaskTemplateServerId: instance.dayTaskTemplateServerId,
        taskTemplateServerId: instance.taskTemplateServerId,
        userId,
        instanceLabel: instance.instanceLabel ?? undefined,
        status,
        startedAt: instance.startedAt?.getTime(),
        completedAt: status === "completed" ? now.getTime() : undefined,
        createdAt: instance.createdAt.getTime(),
        updatedAt: now.getTime(),
      };

      if (networkMonitor.getIsOnline() && instance.serverId) {
        try {
          await convex.mutation(api.mobile.sync.upsertTaskInstance, payload);
          await db
            .update(taskInstances)
            .set({ syncStatus: "synced" })
            .where(eq(taskInstances.clientId, clientId));
        } catch {
          await addToQueue("taskInstances", "update", clientId, payload);
          await syncService.updatePendingCount();
        }
      } else {
        await addToQueue("taskInstances", "update", clientId, payload);
        await syncService.updatePendingCount();
      }
    },
    [convex, instances, userId]
  );

  return {
    taskInstances: enrichedInstances,
    createTaskInstance,
    updateTaskInstanceStatus,
  };
}

export function useTaskInstancesByWorkOrderDay(workOrderDayServerId: string) {
  const { data: instances } = useLiveQuery(
    db
      .select()
      .from(taskInstances)
      .where(eq(taskInstances.workOrderDayServerId, workOrderDayServerId))
  );

  const { data: allResponses } = useLiveQuery(
    db.select().from(fieldResponses)
  );

  const enrichedInstances: TaskInstanceWithResponses[] = (instances ?? []).map(
    (instance) => ({
      ...instance,
      responses: (allResponses ?? []).filter(
        (r) => r.taskInstanceClientId === instance.clientId
      ),
    })
  );

  return {
    taskInstances: enrichedInstances,
  };
}
