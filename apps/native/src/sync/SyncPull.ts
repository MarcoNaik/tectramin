import { eq, and } from "drizzle-orm";
import { db } from "../db/client";
import {
  workOrderDays,
  dayTaskTemplates,
  fieldTemplates,
  taskInstances,
  fieldResponses,
  syncMetadata,
} from "../db/schema";
import type { ConvexReactClient } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type {
  InitialSyncData,
  ServerTaskInstance,
  ServerFieldResponse,
} from "./types";

export async function pullChanges(
  convex: ConvexReactClient,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const instanceMeta = await db
      .select()
      .from(syncMetadata)
      .where(eq(syncMetadata.tableName, "taskInstances"))
      .limit(1);

    const responseMeta = await db
      .select()
      .from(syncMetadata)
      .where(eq(syncMetadata.tableName, "fieldResponses"))
      .limit(1);

    const instanceLastSync = instanceMeta[0]?.lastSyncTimestamp?.getTime() ?? 0;
    const responseLastSync = responseMeta[0]?.lastSyncTimestamp?.getTime() ?? 0;

    const serverInstances: ServerTaskInstance[] = await convex.query(
      api.sync.getTaskInstancesSince,
      {
        userId,
        since: instanceLastSync,
      }
    );

    for (const serverInstance of serverInstances) {
      const localInstance = await db
        .select()
        .from(taskInstances)
        .where(eq(taskInstances.clientId, serverInstance.clientId))
        .limit(1);

      if (
        localInstance.length > 0 &&
        localInstance[0].syncStatus === "pending"
      ) {
        continue;
      }

      if (localInstance.length > 0) {
        await db
          .update(taskInstances)
          .set({
            serverId: serverInstance.serverId,
            status: serverInstance.status,
            instanceLabel: serverInstance.instanceLabel,
            startedAt: serverInstance.startedAt
              ? new Date(serverInstance.startedAt)
              : null,
            completedAt: serverInstance.completedAt
              ? new Date(serverInstance.completedAt)
              : null,
            updatedAt: new Date(serverInstance.updatedAt),
            syncStatus: "synced",
          })
          .where(eq(taskInstances.clientId, serverInstance.clientId));
      } else {
        await db.insert(taskInstances).values({
          clientId: serverInstance.clientId,
          serverId: serverInstance.serverId,
          workOrderDayServerId: serverInstance.workOrderDayServerId,
          dayTaskTemplateServerId: serverInstance.dayTaskTemplateServerId,
          taskTemplateServerId: serverInstance.taskTemplateServerId,
          userId: serverInstance.userId,
          instanceLabel: serverInstance.instanceLabel,
          status: serverInstance.status,
          startedAt: serverInstance.startedAt
            ? new Date(serverInstance.startedAt)
            : null,
          completedAt: serverInstance.completedAt
            ? new Date(serverInstance.completedAt)
            : null,
          createdAt: new Date(serverInstance.createdAt),
          updatedAt: new Date(serverInstance.updatedAt),
          syncStatus: "synced",
        });
      }
    }

    const serverResponses: ServerFieldResponse[] = await convex.query(
      api.sync.getFieldResponsesSince,
      {
        userId,
        since: responseLastSync,
      }
    );

    for (const serverResponse of serverResponses) {
      const localResponse = await db
        .select()
        .from(fieldResponses)
        .where(eq(fieldResponses.clientId, serverResponse.clientId))
        .limit(1);

      if (
        localResponse.length > 0 &&
        localResponse[0].syncStatus === "pending"
      ) {
        continue;
      }

      if (localResponse.length > 0) {
        await db
          .update(fieldResponses)
          .set({
            serverId: serverResponse.serverId,
            value: serverResponse.value,
            updatedAt: new Date(serverResponse.updatedAt),
            syncStatus: "synced",
          })
          .where(eq(fieldResponses.clientId, serverResponse.clientId));
      } else {
        await db.insert(fieldResponses).values({
          clientId: serverResponse.clientId,
          serverId: serverResponse.serverId,
          taskInstanceClientId: serverResponse.taskInstanceClientId,
          fieldTemplateServerId: serverResponse.fieldTemplateServerId,
          value: serverResponse.value,
          userId: serverResponse.userId,
          createdAt: new Date(serverResponse.createdAt),
          updatedAt: new Date(serverResponse.updatedAt),
          syncStatus: "synced",
        });
      }
    }

    const now = new Date();

    if (instanceMeta.length > 0) {
      await db
        .update(syncMetadata)
        .set({ lastSyncTimestamp: now })
        .where(eq(syncMetadata.tableName, "taskInstances"));
    } else {
      await db.insert(syncMetadata).values({
        id: "taskInstances",
        tableName: "taskInstances",
        lastSyncTimestamp: now,
        initialSyncComplete: true,
      });
    }

    if (responseMeta.length > 0) {
      await db
        .update(syncMetadata)
        .set({ lastSyncTimestamp: now })
        .where(eq(syncMetadata.tableName, "fieldResponses"));
    } else {
      await db.insert(syncMetadata).values({
        id: "fieldResponses",
        tableName: "fieldResponses",
        lastSyncTimestamp: now,
        initialSyncComplete: true,
      });
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function initialSync(
  convex: ConvexReactClient,
  clerkUserId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const metadata = await db
      .select()
      .from(syncMetadata)
      .where(
        and(
          eq(syncMetadata.tableName, "assignments"),
          eq(syncMetadata.initialSyncComplete, true)
        )
      )
      .limit(1);

    if (metadata.length > 0) {
      return { success: true };
    }

    const syncData: InitialSyncData = await convex.query(
      api.sync.getInitialSyncData,
      { clerkUserId }
    );

    for (const assignment of syncData.assignments) {
      await db
        .insert(workOrderDays)
        .values({
          serverId: assignment.workOrderDayServerId,
          workOrderServerId: assignment.workOrderServerId,
          workOrderName: assignment.workOrderName,
          customerName: assignment.customerName,
          faenaName: assignment.faenaName,
          dayDate: assignment.dayDate,
          dayNumber: assignment.dayNumber,
          status: assignment.status,
          userId: clerkUserId,
        })
        .onConflictDoUpdate({
          target: workOrderDays.serverId,
          set: {
            workOrderName: assignment.workOrderName,
            customerName: assignment.customerName,
            faenaName: assignment.faenaName,
            status: assignment.status,
          },
        });

      for (const tt of assignment.taskTemplates) {
        await db
          .insert(dayTaskTemplates)
          .values({
            serverId: tt.dayTaskTemplateServerId,
            workOrderDayServerId: assignment.workOrderDayServerId,
            taskTemplateServerId: tt.taskTemplateServerId,
            taskTemplateName: tt.taskTemplateName,
            order: tt.order,
            isRequired: tt.isRequired,
          })
          .onConflictDoUpdate({
            target: dayTaskTemplates.serverId,
            set: {
              taskTemplateName: tt.taskTemplateName,
              order: tt.order,
              isRequired: tt.isRequired,
            },
          });

        for (const field of tt.fields) {
          await db
            .insert(fieldTemplates)
            .values({
              serverId: field.fieldTemplateServerId,
              taskTemplateServerId: tt.taskTemplateServerId,
              label: field.label,
              fieldType: field.fieldType,
              order: field.order,
              isRequired: field.isRequired,
              defaultValue: field.defaultValue,
              placeholder: field.placeholder,
            })
            .onConflictDoUpdate({
              target: fieldTemplates.serverId,
              set: {
                label: field.label,
                fieldType: field.fieldType,
                order: field.order,
                isRequired: field.isRequired,
                defaultValue: field.defaultValue,
                placeholder: field.placeholder,
              },
            });
        }
      }
    }

    for (const instance of syncData.taskInstances) {
      await db
        .insert(taskInstances)
        .values({
          clientId: instance.clientId,
          serverId: instance.serverId,
          workOrderDayServerId: instance.workOrderDayServerId,
          dayTaskTemplateServerId: instance.dayTaskTemplateServerId,
          taskTemplateServerId: instance.taskTemplateServerId,
          userId: instance.userId,
          instanceLabel: instance.instanceLabel,
          status: instance.status,
          startedAt: instance.startedAt
            ? new Date(instance.startedAt)
            : undefined,
          completedAt: instance.completedAt
            ? new Date(instance.completedAt)
            : undefined,
          createdAt: new Date(instance.createdAt),
          updatedAt: new Date(instance.updatedAt),
          syncStatus: "synced",
        })
        .onConflictDoUpdate({
          target: taskInstances.clientId,
          set: {
            serverId: instance.serverId,
            status: instance.status,
            instanceLabel: instance.instanceLabel,
            completedAt: instance.completedAt
              ? new Date(instance.completedAt)
              : undefined,
            updatedAt: new Date(instance.updatedAt),
            syncStatus: "synced",
          },
        });
    }

    for (const response of syncData.fieldResponses) {
      await db
        .insert(fieldResponses)
        .values({
          clientId: response.clientId,
          serverId: response.serverId,
          taskInstanceClientId: response.taskInstanceClientId,
          fieldTemplateServerId: response.fieldTemplateServerId,
          value: response.value,
          userId: response.userId,
          createdAt: new Date(response.createdAt),
          updatedAt: new Date(response.updatedAt),
          syncStatus: "synced",
        })
        .onConflictDoUpdate({
          target: fieldResponses.clientId,
          set: {
            serverId: response.serverId,
            value: response.value,
            updatedAt: new Date(response.updatedAt),
            syncStatus: "synced",
          },
        });
    }

    const now = new Date();

    await db
      .insert(syncMetadata)
      .values({
        id: "assignments",
        tableName: "assignments",
        lastSyncTimestamp: now,
        initialSyncComplete: true,
      })
      .onConflictDoUpdate({
        target: syncMetadata.id,
        set: {
          lastSyncTimestamp: now,
          initialSyncComplete: true,
        },
      });

    await db
      .insert(syncMetadata)
      .values({
        id: "taskInstances",
        tableName: "taskInstances",
        lastSyncTimestamp: now,
        initialSyncComplete: true,
      })
      .onConflictDoUpdate({
        target: syncMetadata.id,
        set: {
          lastSyncTimestamp: now,
          initialSyncComplete: true,
        },
      });

    await db
      .insert(syncMetadata)
      .values({
        id: "fieldResponses",
        tableName: "fieldResponses",
        lastSyncTimestamp: now,
        initialSyncComplete: true,
      })
      .onConflictDoUpdate({
        target: syncMetadata.id,
        set: {
          lastSyncTimestamp: now,
          initialSyncComplete: true,
        },
      });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
