import { eq, and } from "drizzle-orm";
import { db } from "../db/client";
import { tasks, syncMetadata } from "../db/schema";
import type { ConvexReactClient } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { ServerTask } from "./types";

export async function pullChanges(
  convex: ConvexReactClient,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const metadata = await db
      .select()
      .from(syncMetadata)
      .where(eq(syncMetadata.tableName, "tasks"))
      .limit(1);

    const lastSyncTimestamp = metadata[0]?.lastSyncTimestamp?.getTime() ?? 0;

    const serverTasks: ServerTask[] = await convex.query(
      api.sync.getTaskChangesSince,
      {
        userId,
        since: lastSyncTimestamp,
      }
    );

    for (const serverTask of serverTasks) {
      const localTask = await db
        .select()
        .from(tasks)
        .where(eq(tasks.clientId, serverTask.clientId))
        .limit(1);

      if (localTask.length > 0 && localTask[0].syncStatus === "pending") {
        continue;
      }

      if (localTask.length > 0) {
        await db
          .update(tasks)
          .set({
            serverId: serverTask._id,
            text: serverTask.text,
            isCompleted: serverTask.isCompleted,
            updatedAt: new Date(serverTask.updatedAt),
            syncStatus: "synced",
          })
          .where(eq(tasks.clientId, serverTask.clientId));
      } else {
        await db.insert(tasks).values({
          clientId: serverTask.clientId,
          serverId: serverTask._id,
          text: serverTask.text,
          isCompleted: serverTask.isCompleted,
          userId: serverTask.userId,
          createdAt: new Date(serverTask.createdAt),
          updatedAt: new Date(serverTask.updatedAt),
          syncStatus: "synced",
        });
      }
    }

    const now = new Date();
    if (metadata.length > 0) {
      await db
        .update(syncMetadata)
        .set({ lastSyncTimestamp: now })
        .where(eq(syncMetadata.tableName, "tasks"));
    } else {
      await db.insert(syncMetadata).values({
        id: "tasks",
        tableName: "tasks",
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
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const metadata = await db
      .select()
      .from(syncMetadata)
      .where(
        and(
          eq(syncMetadata.tableName, "tasks"),
          eq(syncMetadata.initialSyncComplete, true)
        )
      )
      .limit(1);

    if (metadata.length > 0) {
      return { success: true };
    }

    const serverTasks: ServerTask[] = await convex.query(
      api.sync.getAllTasksForUser,
      { userId }
    );

    for (const serverTask of serverTasks) {
      await db
        .insert(tasks)
        .values({
          clientId: serverTask.clientId,
          serverId: serverTask._id,
          text: serverTask.text,
          isCompleted: serverTask.isCompleted,
          userId: serverTask.userId,
          createdAt: new Date(serverTask.createdAt),
          updatedAt: new Date(serverTask.updatedAt),
          syncStatus: "synced",
        })
        .onConflictDoUpdate({
          target: tasks.clientId,
          set: {
            serverId: serverTask._id,
            text: serverTask.text,
            isCompleted: serverTask.isCompleted,
            updatedAt: new Date(serverTask.updatedAt),
            syncStatus: "synced",
          },
        });
    }

    await db
      .insert(syncMetadata)
      .values({
        id: "tasks",
        tableName: "tasks",
        lastSyncTimestamp: new Date(),
        initialSyncComplete: true,
      })
      .onConflictDoUpdate({
        target: syncMetadata.id,
        set: {
          lastSyncTimestamp: new Date(),
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
