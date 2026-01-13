import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { taskInstances, fieldResponses, attachments, workOrderDays } from "../db/schema";
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
  LocalAttachmentPayload,
  LocalWorkOrderDayStatusPayload,
} from "./types";
import { uploadAndSaveAttachment } from "../services/AttachmentUploader";

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
      const isRoutineTask = payload.workOrderDayServiceServerId !== undefined;
      const result = await convex.mutation(api.mobile.sync.upsertTaskInstance, {
        clientId: payload.clientId,
        workOrderDayServerId: payload.workOrderDayServerId,
        dayTaskTemplateServerId: isRoutineTask ? undefined : payload.dayTaskTemplateServerId,
        workOrderDayServiceServerId: isRoutineTask ? payload.workOrderDayServiceServerId : undefined,
        serviceTaskTemplateServerId: isRoutineTask ? payload.serviceTaskTemplateServerId : undefined,
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
      const result = await convex.mutation(api.mobile.sync.upsertFieldResponse, {
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

  const attachmentOps = operations.filter(
    (op) => op.tableName === "attachments" && op.operation === "upload"
  );

  for (const op of attachmentOps) {
    if ((op.retryCount ?? 0) >= MAX_RETRIES) {
      errors.push(`Operation ${op.id} exceeded max retries`);
      continue;
    }

    try {
      const payload = JSON.parse(op.payload) as LocalAttachmentPayload;

      if (!payload.localUri) {
        await removeFromQueue(op.id);
        continue;
      }

      await db
        .update(attachments)
        .set({ uploadStatus: "uploading" })
        .where(eq(attachments.clientId, payload.clientId));

      const result = await uploadAndSaveAttachment(
        convex,
        payload.localUri,
        payload.mimeType,
        payload.clientId,
        payload.fieldResponseClientId,
        payload.fileName,
        payload.fileType,
        payload.fileSize,
        payload.userId
      );

      if (result.success && result.storageId) {
        await db
          .update(attachments)
          .set({
            serverId: result.serverId,
            storageId: result.storageId,
            uploadStatus: "uploaded",
            syncStatus: "synced",
          })
          .where(eq(attachments.clientId, payload.clientId));

        await removeFromQueue(op.id);
      } else {
        await db
          .update(attachments)
          .set({ uploadStatus: "failed" })
          .where(eq(attachments.clientId, payload.clientId));

        await incrementRetryCount(op.id);
        errors.push(
          `Failed to upload attachment: ${result.error || "Unknown error"}`
        );
      }
    } catch (error) {
      await db
        .update(attachments)
        .set({ uploadStatus: "failed" })
        .where(eq(attachments.clientId, JSON.parse(op.payload).clientId));

      await incrementRetryCount(op.id);
      errors.push(
        `Failed to push attachment ${op.operation}: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  const workOrderDayOps = operations.filter(
    (op) => op.tableName === "workOrderDays"
  );

  for (const op of workOrderDayOps) {
    if ((op.retryCount ?? 0) >= MAX_RETRIES) {
      errors.push(`Operation ${op.id} exceeded max retries`);
      continue;
    }

    try {
      const payload = JSON.parse(op.payload) as LocalWorkOrderDayStatusPayload;
      await convex.mutation(api.mobile.sync.updateWorkOrderDayStatus, {
        workOrderDayServerId: payload.workOrderDayServerId,
        status: payload.status,
      });

      await db
        .update(workOrderDays)
        .set({ syncStatus: "synced" })
        .where(eq(workOrderDays.serverId, payload.workOrderDayServerId));

      await removeFromQueue(op.id);
    } catch (error) {
      await incrementRetryCount(op.id);
      errors.push(
        `Failed to push workOrderDay status ${op.operation}: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  return {
    success: errors.length === 0,
    errors,
  };
}
