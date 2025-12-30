import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import type {
  workOrderDays,
  dayTaskTemplates,
  fieldTemplates,
  fieldConditions,
  taskInstances,
  fieldResponses,
  attachments,
  syncQueue,
  syncMetadata,
  users,
  taskDependencies,
  lookupEntityTypes,
  lookupEntities,
} from "./schema";

export type WorkOrderDay = InferSelectModel<typeof workOrderDays>;
export type NewWorkOrderDay = InferInsertModel<typeof workOrderDays>;

export type DayTaskTemplate = InferSelectModel<typeof dayTaskTemplates>;
export type NewDayTaskTemplate = InferInsertModel<typeof dayTaskTemplates>;

export type FieldTemplate = InferSelectModel<typeof fieldTemplates>;
export type NewFieldTemplate = InferInsertModel<typeof fieldTemplates>;

export type FieldCondition = InferSelectModel<typeof fieldConditions>;
export type NewFieldCondition = InferInsertModel<typeof fieldConditions>;

export type TaskInstance = InferSelectModel<typeof taskInstances>;
export type NewTaskInstance = InferInsertModel<typeof taskInstances>;

export type FieldResponse = InferSelectModel<typeof fieldResponses>;
export type NewFieldResponse = InferInsertModel<typeof fieldResponses>;

export type Attachment = InferSelectModel<typeof attachments>;
export type NewAttachment = InferInsertModel<typeof attachments>;

export type SyncQueueItem = InferSelectModel<typeof syncQueue>;
export type NewSyncQueueItem = InferInsertModel<typeof syncQueue>;

export type SyncMetadataItem = InferSelectModel<typeof syncMetadata>;
export type NewSyncMetadataItem = InferInsertModel<typeof syncMetadata>;

export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;

export type TaskDependency = InferSelectModel<typeof taskDependencies>;
export type NewTaskDependency = InferInsertModel<typeof taskDependencies>;

export type LookupEntityType = InferSelectModel<typeof lookupEntityTypes>;
export type NewLookupEntityType = InferInsertModel<typeof lookupEntityTypes>;

export type LookupEntity = InferSelectModel<typeof lookupEntities>;
export type NewLookupEntity = InferInsertModel<typeof lookupEntities>;

export type SyncStatus = "pending" | "synced";
export type SyncOperation = "create" | "update" | "upload";

export type TaskInstanceStatus = "draft" | "completed";
export type FieldType = "text" | "number" | "boolean" | "date" | "attachment" | "displayText" | "select" | "userSelect" | "entitySelect";
export type AttachmentUploadStatus = "pending" | "uploading" | "uploaded" | "failed";

export interface TaskInstanceInput {
  workOrderDayServerId: string;
  dayTaskTemplateServerId: string;
  taskTemplateServerId: string;
  instanceLabel?: string;
}

export interface FieldResponseInput {
  taskInstanceClientId: string;
  fieldTemplateServerId: string;
  value?: string;
}
