import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import type { tasks, syncQueue, syncMetadata } from "./schema";

export type Task = InferSelectModel<typeof tasks>;
export type NewTask = InferInsertModel<typeof tasks>;

export type SyncQueueItem = InferSelectModel<typeof syncQueue>;
export type NewSyncQueueItem = InferInsertModel<typeof syncQueue>;

export type SyncMetadata = InferSelectModel<typeof syncMetadata>;
export type NewSyncMetadata = InferInsertModel<typeof syncMetadata>;

export type SyncStatus = "pending" | "synced";
export type SyncOperation = "create" | "update";

export interface TaskInput {
  text: string;
  isCompleted?: boolean;
}
