import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { tasks } from "../db/schema";
import {
  getQueuedOperations,
  removeFromQueue,
  incrementRetryCount,
} from "./SyncQueue";
import type { ConvexReactClient } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { LocalTaskPayload } from "./types";

const MAX_RETRIES = 3;

export async function pushChanges(convex: ConvexReactClient): Promise<{
  success: boolean;
  errors: string[];
}> {
  const operations = await getQueuedOperations();
  const errors: string[] = [];

  for (const op of operations) {
    if ((op.retryCount ?? 0) >= MAX_RETRIES) {
      errors.push(`Operation ${op.id} exceeded max retries`);
      continue;
    }

    try {
      if (op.tableName === "tasks") {
        const payload = JSON.parse(op.payload) as LocalTaskPayload;
        const result = await convex.mutation(api.sync.upsertTask, {
          clientId: payload.clientId,
          text: payload.text,
          isCompleted: payload.isCompleted,
          userId: payload.userId,
          createdAt: payload.createdAt,
          updatedAt: payload.updatedAt,
        });

        await db
          .update(tasks)
          .set({
            serverId: result.serverId,
            syncStatus: "synced",
          })
          .where(eq(tasks.clientId, payload.clientId));

        await removeFromQueue(op.id);
      }
    } catch (error) {
      await incrementRetryCount(op.id);
      errors.push(
        `Failed to push ${op.tableName} ${op.operation}: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  return {
    success: errors.length === 0,
    errors,
  };
}
