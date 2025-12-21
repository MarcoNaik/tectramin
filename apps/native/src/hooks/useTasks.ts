import { useState, useEffect, useCallback } from "react";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { db } from "../db/client";
import { tasks } from "../db/schema";
import { addToQueue } from "../sync/SyncQueue";
import { syncService } from "../sync/SyncService";
import { networkMonitor } from "../sync/NetworkMonitor";
import { useConvex } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Task, TaskInput } from "../db/types";

export function useTasks(userId: string) {
  const convex = useConvex();

  const { data: localTasks } = useLiveQuery(
    db.select().from(tasks).where(eq(tasks.userId, userId))
  );

  useEffect(() => {
    console.log("[useTasks] localTasks updated:", localTasks?.length, "tasks");
  }, [localTasks]);

  const createTask = useCallback(
    async (input: TaskInput) => {
      console.log("[useTasks] createTask called with:", input);
      const now = new Date();
      const clientId = uuidv4();

      const newTask = {
        clientId,
        text: input.text,
        isCompleted: input.isCompleted ?? false,
        userId,
        createdAt: now,
        updatedAt: now,
        syncStatus: "pending" as const,
      };

      console.log("[useTasks] Inserting task into SQLite:", newTask);
      try {
        await db.insert(tasks).values(newTask);
        console.log("[useTasks] Task inserted successfully into SQLite");
      } catch (error) {
        console.error("[useTasks] Error inserting task into SQLite:", error);
        throw error;
      }

      const isOnline = networkMonitor.getIsOnline();
      console.log("[useTasks] Network status - isOnline:", isOnline);

      if (isOnline) {
        try {
          console.log("[useTasks] Attempting to sync with Convex...");
          const serverId = await convex.mutation(api.tasks.create, {
            clientId,
            text: input.text,
            userId,
          });
          console.log("[useTasks] Convex sync successful, serverId:", serverId);
          await db
            .update(tasks)
            .set({ serverId, syncStatus: "synced" })
            .where(eq(tasks.clientId, clientId));
          console.log("[useTasks] Updated task with serverId in SQLite");
        } catch (error) {
          console.error("[useTasks] Error syncing with Convex:", error);
          await addToQueue("tasks", "create", clientId, {
            clientId,
            text: input.text,
            isCompleted: false,
            userId,
            createdAt: now.getTime(),
            updatedAt: now.getTime(),
          });
          await syncService.updatePendingCount();
          console.log("[useTasks] Added task to sync queue");
        }
      } else {
        console.log("[useTasks] Offline - adding to sync queue");
        await addToQueue("tasks", "create", clientId, {
          clientId,
          text: input.text,
          isCompleted: false,
          userId,
          createdAt: now.getTime(),
          updatedAt: now.getTime(),
        });
        await syncService.updatePendingCount();
        console.log("[useTasks] Added task to sync queue");
      }
    },
    [convex, userId]
  );

  const toggleTask = useCallback(
    async (clientId: string) => {
      const task = localTasks?.find((t) => t.clientId === clientId);
      if (!task) return;

      const now = new Date();
      const newIsCompleted = !task.isCompleted;

      await db
        .update(tasks)
        .set({
          isCompleted: newIsCompleted,
          updatedAt: now,
          syncStatus: "pending",
        })
        .where(eq(tasks.clientId, clientId));

      if (networkMonitor.getIsOnline() && task.serverId) {
        try {
          await convex.mutation(api.tasks.toggle, {
            id: task.serverId as any,
          });
          await db
            .update(tasks)
            .set({ syncStatus: "synced" })
            .where(eq(tasks.clientId, clientId));
        } catch {
          await addToQueue("tasks", "update", clientId, {
            clientId,
            serverId: task.serverId,
            text: task.text,
            isCompleted: newIsCompleted,
            userId,
            createdAt: task.createdAt.getTime(),
            updatedAt: now.getTime(),
          });
          await syncService.updatePendingCount();
        }
      } else {
        await addToQueue("tasks", "update", clientId, {
          clientId,
          serverId: task.serverId,
          text: task.text,
          isCompleted: newIsCompleted,
          userId,
          createdAt: task.createdAt.getTime(),
          updatedAt: now.getTime(),
        });
        await syncService.updatePendingCount();
      }
    },
    [convex, localTasks, userId]
  );

  return {
    tasks: localTasks ?? [],
    createTask,
    toggleTask,
  };
}
