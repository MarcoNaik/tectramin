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
  operation: "create" | "update";
  recordClientId: string;
  payload: string;
  createdAt: Date;
  retryCount: number;
}

export interface ServerFieldTemplate {
  fieldTemplateServerId: string;
  label: string;
  fieldType: string;
  order: number;
  isRequired: boolean;
  defaultValue?: string;
  placeholder?: string;
}

export interface ServerDayTaskTemplate {
  dayTaskTemplateServerId: string;
  taskTemplateServerId: string;
  taskTemplateName: string;
  order: number;
  isRequired: boolean;
  fields: ServerFieldTemplate[];
}

export interface ServerAssignment {
  workOrderDayServerId: string;
  workOrderServerId: string;
  workOrderName: string;
  customerName: string;
  faenaName: string;
  dayDate: number;
  dayNumber: number;
  status: string;
  taskTemplates: ServerDayTaskTemplate[];
}

export interface ServerTaskInstance {
  serverId: string;
  clientId: string;
  workOrderDayServerId: string;
  dayTaskTemplateServerId: string;
  taskTemplateServerId: string;
  userId: string;
  instanceLabel?: string;
  status: string;
  startedAt?: number;
  completedAt?: number;
  createdAt: number;
  updatedAt: number;
}

export interface ServerFieldResponse {
  serverId: string;
  clientId: string;
  taskInstanceServerId: string;
  taskInstanceClientId: string;
  fieldTemplateServerId: string;
  value?: string;
  userId: string;
  createdAt: number;
  updatedAt: number;
}

export interface InitialSyncData {
  assignments: ServerAssignment[];
  taskInstances: ServerTaskInstance[];
  fieldResponses: ServerFieldResponse[];
}

export interface LocalTaskInstancePayload {
  clientId: string;
  serverId?: string;
  workOrderDayServerId: string;
  dayTaskTemplateServerId: string;
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
