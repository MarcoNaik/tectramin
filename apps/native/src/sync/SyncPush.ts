import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { taskInstances, fieldResponses } from "../db/schema";
import {
  getQueuedOperations,
  removeFromQueue,
  incrementRetryCount,
} from "./SyncQueue";
import type { ConvexReactClient } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type {
  LocalTaskInstancePayload,
  LocalFieldResponsePayload,
} from "./types";

const MAX_RETRIES = 3;

export async function pushChanges(convex: ConvexReactClient): Promise<{
  success: boolean;
  errors: string[];
}> {
  const operations = await getQueuedOperations();
  const errors: string[] = [];

  const taskInstanceOps = operations.filter(
    (op) => op.tableName === "taskInstances"
  );
  const fieldResponseOps = operations.filter(
    (op) => op.tableName === "fieldResponses"
  );

  for (const op of taskInstanceOps) {
    if ((op.retryCount ?? 0) >= MAX_RETRIES) {
      errors.push(`Operation ${op.id} exceeded max retries`);
      continue;
    }

    try {
      const payload = JSON.parse(op.payload) as LocalTaskInstancePayload;
      const result = await convex.mutation(api.sync.upsertTaskInstance, {
        clientId: payload.clientId,
        workOrderDayServerId: payload.workOrderDayServerId,
        dayTaskTemplateServerId: payload.dayTaskTemplateServerId,
        taskTemplateServerId: payload.taskTemplateServerId,
        userId: payload.userId,
        instanceLabel: payload.instanceLabel,
        status: payload.status,
        startedAt: payload.startedAt,
        completedAt: payload.completedAt,
        createdAt: payload.createdAt,
        updatedAt: payload.updatedAt,
      });

      await db
        .update(taskInstances)
        .set({
          serverId: result.serverId,
          syncStatus: "synced",
        })
        .where(eq(taskInstances.clientId, payload.clientId));

      await removeFromQueue(op.id);
    } catch (error) {
      await incrementRetryCount(op.id);
      errors.push(
        `Failed to push taskInstance ${op.operation}: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  for (const op of fieldResponseOps) {
    if ((op.retryCount ?? 0) >= MAX_RETRIES) {
      errors.push(`Operation ${op.id} exceeded max retries`);
      continue;
    }

    try {
      const payload = JSON.parse(op.payload) as LocalFieldResponsePayload;
      const result = await convex.mutation(api.sync.upsertFieldResponse, {
        clientId: payload.clientId,
        taskInstanceClientId: payload.taskInstanceClientId,
        fieldTemplateServerId: payload.fieldTemplateServerId,
        value: payload.value,
        userId: payload.userId,
        createdAt: payload.createdAt,
        updatedAt: payload.updatedAt,
      });

      await db
        .update(fieldResponses)
        .set({
          serverId: result.serverId,
          syncStatus: "synced",
        })
        .where(eq(fieldResponses.clientId, payload.clientId));

      await removeFromQueue(op.id);
    } catch (error) {
      await incrementRetryCount(op.id);
      errors.push(
        `Failed to push fieldResponse ${op.operation}: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  return {
    success: errors.length === 0,
    errors,
  };
}
