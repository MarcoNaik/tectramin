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

      const existing = (responses ?? []).find(
        (r) => r.fieldTemplateServerId === input.fieldTemplateServerId
      );

      if (existing) {
        await db
          .update(fieldResponses)
          .set({
            value: input.value,
            updatedAt: now,
            syncStatus: "pending",
          })
          .where(eq(fieldResponses.clientId, existing.clientId));

        const payload = {
          clientId: existing.clientId,
          taskInstanceClientId: input.taskInstanceClientId,
          fieldTemplateServerId: input.fieldTemplateServerId,
          value: input.value,
          userId,
          createdAt: existing.createdAt.getTime(),
          updatedAt: now.getTime(),
        };

        if (networkMonitor.getIsOnline()) {
          try {
            await convex.mutation(api.mobile.sync.upsertFieldResponse, payload);
            await db
              .update(fieldResponses)
              .set({ syncStatus: "synced" })
              .where(eq(fieldResponses.clientId, existing.clientId));
          } catch {
            await addToQueue(
              "fieldResponses",
              "update",
              existing.clientId,
              payload
            );
            await syncService.updatePendingCount();
          }
        } else {
          await addToQueue(
            "fieldResponses",
            "update",
            existing.clientId,
            payload
          );
          await syncService.updatePendingCount();
        }

        return existing.clientId;
      } else {
        const clientId = uuidv4();

        await db.insert(fieldResponses).values({
          clientId,
          taskInstanceClientId: input.taskInstanceClientId,
          fieldTemplateServerId: input.fieldTemplateServerId,
          value: input.value,
          userId,
          createdAt: now,
          updatedAt: now,
          syncStatus: "pending",
        });

        const payload = {
          clientId,
          taskInstanceClientId: input.taskInstanceClientId,
          fieldTemplateServerId: input.fieldTemplateServerId,
          value: input.value,
          userId,
          createdAt: now.getTime(),
          updatedAt: now.getTime(),
        };

        if (networkMonitor.getIsOnline()) {
          try {
            const result = await convex.mutation(
              api.mobile.sync.upsertFieldResponse,
              payload
            );
            await db
              .update(fieldResponses)
              .set({ serverId: result.serverId, syncStatus: "synced" })
              .where(eq(fieldResponses.clientId, clientId));
          } catch {
            await addToQueue("fieldResponses", "create", clientId, payload);
            await syncService.updatePendingCount();
          }
        } else {
          await addToQueue("fieldResponses", "create", clientId, payload);
          await syncService.updatePendingCount();
        }

        return clientId;
      }
    },
    [convex, responses, userId]
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
