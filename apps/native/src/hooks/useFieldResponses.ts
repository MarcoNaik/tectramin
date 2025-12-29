import { useCallback } from "react";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { db } from "../db/client";
import { fieldResponses } from "../db/schema";
import { addToQueue } from "../sync/SyncQueue";
import { syncService } from "../sync/SyncService";
import { networkMonitor } from "../sync/NetworkMonitor";
import { useConvex } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { FieldResponse, FieldResponseInput } from "../db/types";

export function useFieldResponses(taskInstanceClientId: string, userId: string) {
  const convex = useConvex();

  const { data: responses } = useLiveQuery(
    db
      .select()
      .from(fieldResponses)
      .where(eq(fieldResponses.taskInstanceClientId, taskInstanceClientId))
  );

  const upsertResponse = useCallback(
    async (input: FieldResponseInput) => {
      const now = new Date();
      const newClientId = uuidv4();

      const result = await db
        .insert(fieldResponses)
        .values({
          clientId: newClientId,
          taskInstanceClientId: input.taskInstanceClientId,
          fieldTemplateServerId: input.fieldTemplateServerId,
          value: input.value,
          userId,
          createdAt: now,
          updatedAt: now,
          syncStatus: "pending",
        })
        .onConflictDoUpdate({
          target: [
            fieldResponses.taskInstanceClientId,
            fieldResponses.fieldTemplateServerId,
          ],
          set: {
            value: input.value,
            updatedAt: now,
            syncStatus: "pending",
          },
        })
        .returning();

      const row = result[0];
      const clientId = row.clientId;
      const isNew = clientId === newClientId;

      const payload = {
        clientId,
        taskInstanceClientId: input.taskInstanceClientId,
        fieldTemplateServerId: input.fieldTemplateServerId,
        value: input.value,
        userId,
        createdAt: row.createdAt.getTime(),
        updatedAt: now.getTime(),
      };

      if (networkMonitor.getIsOnline()) {
        try {
          const syncResult = await convex.mutation(
            api.mobile.sync.upsertFieldResponse,
            payload
          );
          await db
            .update(fieldResponses)
            .set({ serverId: syncResult.serverId, syncStatus: "synced" })
            .where(eq(fieldResponses.clientId, clientId));
        } catch {
          await addToQueue(
            "fieldResponses",
            isNew ? "create" : "update",
            clientId,
            payload
          );
          await syncService.updatePendingCount();
        }
      } else {
        await addToQueue(
          "fieldResponses",
          isNew ? "create" : "update",
          clientId,
          payload
        );
        await syncService.updatePendingCount();
      }

      return clientId;
    },
    [convex, userId]
  );

  const getResponseForField = useCallback(
    (fieldTemplateServerId: string): FieldResponse | undefined => {
      return (responses ?? []).find(
        (r) => r.fieldTemplateServerId === fieldTemplateServerId
      );
    },
    [responses]
  );

  return {
    responses: responses ?? [],
    upsertResponse,
    getResponseForField,
  };
}
