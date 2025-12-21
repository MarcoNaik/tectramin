import { eq, asc } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { db } from "../db/client";
import { syncQueue } from "../db/schema";
import type { SyncQueueItem, SyncOperation } from "../db/types";

export async function addToQueue(
  tableName: string,
  operation: SyncOperation,
  recordClientId: string,
  payload: object
): Promise<void> {
  await db.insert(syncQueue).values({
    id: uuidv4(),
    tableName,
    operation,
    recordClientId,
    payload: JSON.stringify(payload),
    createdAt: new Date(),
    retryCount: 0,
  });
}

export async function getQueuedOperations(): Promise<SyncQueueItem[]> {
  return db.select().from(syncQueue).orderBy(asc(syncQueue.createdAt));
}

export async function removeFromQueue(id: string): Promise<void> {
  await db.delete(syncQueue).where(eq(syncQueue.id, id));
}

export async function incrementRetryCount(id: string): Promise<void> {
  const item = await db
    .select()
    .from(syncQueue)
    .where(eq(syncQueue.id, id))
    .limit(1);

  if (item.length > 0) {
    await db
      .update(syncQueue)
      .set({ retryCount: (item[0].retryCount ?? 0) + 1 })
      .where(eq(syncQueue.id, id));
  }
}

export async function getQueueCount(): Promise<number> {
  const result = await db.select().from(syncQueue);
  return result.length;
}

export async function clearQueue(): Promise<void> {
  await db.delete(syncQueue);
}
