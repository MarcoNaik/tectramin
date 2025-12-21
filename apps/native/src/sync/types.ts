import type { Id } from "@packages/backend/convex/_generated/dataModel";

export type SyncState = "idle" | "syncing" | "error";

export interface SyncStatus {
  state: SyncState;
  pendingCount: number;
  lastSyncAt: Date | null;
  error: string | null;
}

export interface ServerTask {
  _id: Id<"tasks">;
  clientId: string;
  text: string;
  isCompleted: boolean;
  userId: string;
  createdAt: number;
  updatedAt: number;
}

export interface LocalTaskPayload {
  clientId: string;
  serverId?: string;
  text: string;
  isCompleted: boolean;
  userId: string;
  createdAt: number;
  updatedAt: number;
}

export interface QueuedOperation {
  id: string;
  tableName: string;
  operation: "create" | "update";
  recordClientId: string;
  payload: string;
  createdAt: Date;
  retryCount: number;
}
