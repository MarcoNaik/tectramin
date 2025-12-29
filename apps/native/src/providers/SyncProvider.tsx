import React, { createContext, useContext, useEffect, useState, ReactNode, useRef } from "react";
import { useConvex, useQuery } from "convex/react";
import { useUser } from "@clerk/clerk-expo";
import { eq, and } from "drizzle-orm";
import { api } from "@packages/backend/convex/_generated/api";
import { syncService } from "../sync/SyncService";
import { db } from "../db/client";
import {
  workOrderDays,
  dayTaskTemplates,
  fieldTemplates,
  fieldConditions,
  taskInstances,
  fieldResponses,
  attachments,
  users,
  taskDependencies,
} from "../db/schema";
import type { SyncStatus } from "../sync/types";

interface SyncContextValue {
  status: SyncStatus;
  sync: () => Promise<void>;
  isInitialized: boolean;
}

const SyncContext = createContext<SyncContextValue | null>(null);

interface SyncProviderProps {
  children: ReactNode;
}

export function SyncProvider({ children }: SyncProviderProps) {
  const convex = useConvex();
  const { user, isLoaded } = useUser();
  const [isInitialized, setIsInitialized] = useState(false);
  const [status, setStatus] = useState<SyncStatus>(syncService.getStatus());
  const prevAssignmentsRef = useRef<string | null>(null);
  const prevInstancesRef = useRef<string | null>(null);
  const prevResponsesRef = useRef<string | null>(null);
  const prevAttachmentsRef = useRef<string | null>(null);
  const prevUsersRef = useRef<string | null>(null);
  const prevConditionsRef = useRef<string | null>(null);
  const prevDependenciesRef = useRef<string | null>(null);

  const serverAssignments = useQuery(
    api.mobile.sync.getAssignmentsForUser,
    user?.id && isInitialized ? { clerkUserId: user.id } : "skip"
  );

  const serverTaskInstances = useQuery(
    api.mobile.sync.getTaskInstancesForUser,
    user?.id && isInitialized ? { clerkUserId: user.id } : "skip"
  );

  const serverFieldResponses = useQuery(
    api.mobile.sync.getFieldResponsesForUser,
    user?.id && isInitialized ? { clerkUserId: user.id } : "skip"
  );

  const serverAttachments = useQuery(
    api.mobile.sync.getAttachmentsForUser,
    user?.id && isInitialized ? { clerkUserId: user.id } : "skip"
  );

  const serverUsers = useQuery(
    api.mobile.sync.getUsers,
    isInitialized ? {} : "skip"
  );

  const serverConditions = useQuery(
    api.mobile.sync.getFieldConditionsForUser,
    user?.id && isInitialized ? { clerkUserId: user.id } : "skip"
  );

  const serverDependencies = useQuery(
    api.mobile.sync.getTaskDependenciesForUser,
    user?.id && isInitialized ? { clerkUserId: user.id } : "skip"
  );

  useEffect(() => {
    if (!serverAssignments || !user?.id) return;

    const newHash = JSON.stringify(serverAssignments);
    if (prevAssignmentsRef.current === newHash) return;
    prevAssignmentsRef.current = newHash;

    const syncAssignments = async () => {
      for (const assignment of serverAssignments) {
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
            userId: user.id,
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
                subheader: field.subheader,
                displayStyle: field.displayStyle,
                conditionLogic: field.conditionLogic,
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
                  subheader: field.subheader,
                  displayStyle: field.displayStyle,
                  conditionLogic: field.conditionLogic,
                },
              });
          }
        }
      }
    };

    syncAssignments();
  }, [serverAssignments, user?.id]);

  useEffect(() => {
    if (!serverTaskInstances || !user?.id) return;

    const newHash = JSON.stringify(serverTaskInstances);
    if (prevInstancesRef.current === newHash) return;
    prevInstancesRef.current = newHash;

    const syncInstances = async () => {
      for (const instance of serverTaskInstances) {
        const local = await db
          .select()
          .from(taskInstances)
          .where(eq(taskInstances.clientId, instance.clientId))
          .limit(1);

        if (local.length > 0 && local[0].syncStatus === "pending") {
          continue;
        }

        const duplicates = await db
          .select()
          .from(taskInstances)
          .where(
            and(
              eq(taskInstances.workOrderDayServerId, instance.workOrderDayServerId),
              eq(taskInstances.dayTaskTemplateServerId, instance.dayTaskTemplateServerId),
              eq(taskInstances.userId, instance.userId)
            )
          );

        for (const dup of duplicates) {
          if (dup.clientId !== instance.clientId) {
            await db.delete(taskInstances).where(eq(taskInstances.clientId, dup.clientId));
          }
        }

        if (local.length > 0) {
          await db
            .update(taskInstances)
            .set({
              serverId: instance.serverId,
              status: instance.status,
              instanceLabel: instance.instanceLabel,
              startedAt: instance.startedAt ? new Date(instance.startedAt) : null,
              completedAt: instance.completedAt ? new Date(instance.completedAt) : null,
              updatedAt: new Date(instance.updatedAt),
              syncStatus: "synced",
            })
            .where(eq(taskInstances.clientId, instance.clientId));
        } else {
          await db.insert(taskInstances).values({
            clientId: instance.clientId,
            serverId: instance.serverId,
            workOrderDayServerId: instance.workOrderDayServerId,
            dayTaskTemplateServerId: instance.dayTaskTemplateServerId,
            taskTemplateServerId: instance.taskTemplateServerId,
            userId: instance.userId,
            instanceLabel: instance.instanceLabel,
            status: instance.status,
            startedAt: instance.startedAt ? new Date(instance.startedAt) : null,
            completedAt: instance.completedAt ? new Date(instance.completedAt) : null,
            createdAt: new Date(instance.createdAt),
            updatedAt: new Date(instance.updatedAt),
            syncStatus: "synced",
          });
        }
      }
    };

    syncInstances();
  }, [serverTaskInstances, user?.id]);

  useEffect(() => {
    if (!serverFieldResponses || !user?.id) return;

    const newHash = JSON.stringify(serverFieldResponses);
    if (prevResponsesRef.current === newHash) return;
    prevResponsesRef.current = newHash;

    const syncResponses = async () => {
      for (const response of serverFieldResponses) {
        const local = await db
          .select()
          .from(fieldResponses)
          .where(eq(fieldResponses.clientId, response.clientId))
          .limit(1);

        if (local.length > 0 && local[0].syncStatus === "pending") {
          continue;
        }

        if (local.length > 0) {
          await db
            .update(fieldResponses)
            .set({
              serverId: response.serverId,
              value: response.value,
              updatedAt: new Date(response.updatedAt),
              syncStatus: "synced",
            })
            .where(eq(fieldResponses.clientId, response.clientId));
        } else {
          await db.insert(fieldResponses).values({
            clientId: response.clientId,
            serverId: response.serverId,
            taskInstanceClientId: response.taskInstanceClientId,
            fieldTemplateServerId: response.fieldTemplateServerId,
            value: response.value,
            userId: response.userId,
            createdAt: new Date(response.createdAt),
            updatedAt: new Date(response.updatedAt),
            syncStatus: "synced",
          });
        }
      }
    };

    syncResponses();
  }, [serverFieldResponses, user?.id]);

  useEffect(() => {
    if (!serverAttachments || !user?.id) return;

    const newHash = JSON.stringify(serverAttachments);
    if (prevAttachmentsRef.current === newHash) return;
    prevAttachmentsRef.current = newHash;

    const syncAttachmentData = async () => {
      for (const attachment of serverAttachments) {
        const local = await db
          .select()
          .from(attachments)
          .where(eq(attachments.clientId, attachment.clientId))
          .limit(1);

        if (local.length > 0 && local[0].syncStatus === "pending") {
          continue;
        }

        if (local.length > 0) {
          await db
            .update(attachments)
            .set({
              serverId: attachment.serverId,
              storageId: attachment.storageId,
              storageUrl: attachment.storageUrl,
              uploadStatus: attachment.uploadStatus as "pending" | "uploading" | "uploaded" | "failed",
              updatedAt: new Date(attachment.updatedAt),
              syncStatus: "synced",
            })
            .where(eq(attachments.clientId, attachment.clientId));
        } else {
          await db.insert(attachments).values({
            clientId: attachment.clientId,
            serverId: attachment.serverId,
            fieldResponseClientId: attachment.fieldResponseClientId,
            storageId: attachment.storageId,
            storageUrl: attachment.storageUrl,
            fileName: attachment.fileName,
            fileType: attachment.fileType,
            mimeType: attachment.mimeType,
            fileSize: attachment.fileSize,
            userId: attachment.userId,
            uploadStatus: attachment.uploadStatus as "pending" | "uploading" | "uploaded" | "failed",
            createdAt: new Date(attachment.createdAt),
            updatedAt: new Date(attachment.updatedAt),
            syncStatus: "synced",
          });
        }
      }
    };

    syncAttachmentData();
  }, [serverAttachments, user?.id]);

  useEffect(() => {
    if (!serverUsers) return;

    const newHash = JSON.stringify(serverUsers);
    if (prevUsersRef.current === newHash) return;
    prevUsersRef.current = newHash;

    const syncUserData = async () => {
      for (const serverUser of serverUsers) {
        await db
          .insert(users)
          .values({
            serverId: serverUser.serverId,
            fullName: serverUser.fullName,
            email: serverUser.email,
          })
          .onConflictDoUpdate({
            target: users.serverId,
            set: {
              fullName: serverUser.fullName,
              email: serverUser.email,
            },
          });
      }
    };

    syncUserData();
  }, [serverUsers]);

  useEffect(() => {
    if (!serverConditions || !user?.id) return;

    const newHash = JSON.stringify(serverConditions);
    if (prevConditionsRef.current === newHash) return;
    prevConditionsRef.current = newHash;

    const syncConditionData = async () => {
      const existingConditions = await db.select().from(fieldConditions);
      const existingIds = new Set(existingConditions.map((c) => c.serverId));
      const serverIds = new Set(serverConditions.map((c) => c.serverId));

      for (const existing of existingConditions) {
        if (!serverIds.has(existing.serverId)) {
          await db
            .delete(fieldConditions)
            .where(eq(fieldConditions.serverId, existing.serverId));
        }
      }

      for (const condition of serverConditions) {
        const valueStr =
          typeof condition.value === "string"
            ? condition.value
            : JSON.stringify(condition.value);

        await db
          .insert(fieldConditions)
          .values({
            serverId: condition.serverId,
            childFieldServerId: condition.childFieldServerId,
            parentFieldServerId: condition.parentFieldServerId,
            operator: condition.operator,
            value: valueStr,
            conditionGroup: condition.conditionGroup,
          })
          .onConflictDoUpdate({
            target: fieldConditions.serverId,
            set: {
              childFieldServerId: condition.childFieldServerId,
              parentFieldServerId: condition.parentFieldServerId,
              operator: condition.operator,
              value: valueStr,
              conditionGroup: condition.conditionGroup,
            },
          });
      }
    };

    syncConditionData();
  }, [serverConditions, user?.id]);

  useEffect(() => {
    if (!serverDependencies || !user?.id) return;

    const newHash = JSON.stringify(serverDependencies);
    if (prevDependenciesRef.current === newHash) return;
    prevDependenciesRef.current = newHash;

    const syncDependencyData = async () => {
      const existingDeps = await db.select().from(taskDependencies);
      const existingIds = new Set(existingDeps.map((d) => d.serverId));
      const serverIds = new Set(serverDependencies.map((d) => d.serverId));

      for (const existing of existingDeps) {
        if (!serverIds.has(existing.serverId)) {
          await db
            .delete(taskDependencies)
            .where(eq(taskDependencies.serverId, existing.serverId));
        }
      }

      for (const dep of serverDependencies) {
        await db
          .insert(taskDependencies)
          .values({
            serverId: dep.serverId,
            dependentTaskServerId: dep.dependentTaskServerId,
            prerequisiteTaskServerId: dep.prerequisiteTaskServerId,
            workOrderDayServerId: dep.workOrderDayServerId,
          })
          .onConflictDoUpdate({
            target: taskDependencies.serverId,
            set: {
              dependentTaskServerId: dep.dependentTaskServerId,
              prerequisiteTaskServerId: dep.prerequisiteTaskServerId,
              workOrderDayServerId: dep.workOrderDayServerId,
            },
          });
      }
    };

    syncDependencyData();
  }, [serverDependencies, user?.id]);

  useEffect(() => {
    if (!isLoaded || !user) return;

    syncService.initialize(convex);
    setIsInitialized(true);

    const unsubscribe = syncService.subscribe(setStatus);

    return () => {
      unsubscribe();
      syncService.destroy();
    };
  }, [convex, user, isLoaded]);

  const sync = async () => {
    await syncService.sync();
  };

  return (
    <SyncContext.Provider value={{ status, sync, isInitialized }}>
      {children}
    </SyncContext.Provider>
  );
}

export function useSyncContext() {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error("useSyncContext must be used within a SyncProvider");
  }
  return context;
}
