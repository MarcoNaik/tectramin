export type SyncState = "idle" | "syncing" | "error";

export interface SyncStatus {
  state: SyncState;
  pendingCount: number;
  lastSyncAt: Date | null;
  error: string | null;
}

export interface QueuedOperation {
  id: string;
  tableName: string;
  operation: "create" | "update" | "upload";
  recordClientId: string;
  payload: string;
  createdAt: Date;
  retryCount: number;
}

export interface LocalTaskInstancePayload {
  clientId: string;
  serverId?: string;
  workOrderDayServerId: string;
  dayTaskTemplateServerId?: string;
  workOrderDayServiceServerId?: string;
  serviceTaskTemplateServerId?: string;
  taskTemplateServerId: string;
  userId: string;
  instanceLabel?: string;
  status: string;
  startedAt?: number;
  completedAt?: number;
  createdAt: number;
  updatedAt: number;
}

export interface LocalFieldResponsePayload {
  clientId: string;
  serverId?: string;
  taskInstanceClientId: string;
  fieldTemplateServerId: string;
  value?: string;
  userId: string;
  createdAt: number;
  updatedAt: number;
}

export interface LocalAttachmentPayload {
  clientId: string;
  serverId?: string;
  fieldResponseClientId: string;
  localUri?: string;
  storageId?: string;
  fileName: string;
  fileType: string;
  mimeType: string;
  fileSize: number;
  userId: string;
  uploadStatus: string;
  createdAt: number;
  updatedAt: number;
}

export interface LocalWorkOrderDayStatusPayload {
  workOrderDayServerId: string;
  status: string;
}
