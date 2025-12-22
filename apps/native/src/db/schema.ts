import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const workOrderDays = sqliteTable("work_order_days", {
  serverId: text("server_id").primaryKey(),
  workOrderServerId: text("work_order_server_id").notNull(),
  workOrderName: text("work_order_name").notNull(),
  customerName: text("customer_name").notNull(),
  faenaName: text("faena_name").notNull(),
  dayDate: integer("day_date").notNull(),
  dayNumber: integer("day_number").notNull(),
  status: text("status").notNull(),
  userId: text("user_id").notNull(),
});

export const dayTaskTemplates = sqliteTable("day_task_templates", {
  serverId: text("server_id").primaryKey(),
  workOrderDayServerId: text("work_order_day_server_id").notNull(),
  taskTemplateServerId: text("task_template_server_id").notNull(),
  taskTemplateName: text("task_template_name").notNull(),
  order: integer("order").notNull(),
  isRequired: integer("is_required", { mode: "boolean" }).notNull(),
});

export const fieldTemplates = sqliteTable("field_templates", {
  serverId: text("server_id").primaryKey(),
  taskTemplateServerId: text("task_template_server_id").notNull(),
  label: text("label").notNull(),
  fieldType: text("field_type").notNull(),
  order: integer("order").notNull(),
  isRequired: integer("is_required", { mode: "boolean" }).notNull(),
  defaultValue: text("default_value"),
  placeholder: text("placeholder"),
});

export const taskInstances = sqliteTable("task_instances", {
  clientId: text("client_id").primaryKey(),
  serverId: text("server_id"),
  workOrderDayServerId: text("work_order_day_server_id").notNull(),
  dayTaskTemplateServerId: text("day_task_template_server_id").notNull(),
  taskTemplateServerId: text("task_template_server_id").notNull(),
  userId: text("user_id").notNull(),
  instanceLabel: text("instance_label"),
  status: text("status").notNull(),
  startedAt: integer("started_at", { mode: "timestamp" }),
  completedAt: integer("completed_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  syncStatus: text("sync_status", { enum: ["pending", "synced"] }).default(
    "synced"
  ),
});

export const fieldResponses = sqliteTable("field_responses", {
  clientId: text("client_id").primaryKey(),
  serverId: text("server_id"),
  taskInstanceClientId: text("task_instance_client_id").notNull(),
  fieldTemplateServerId: text("field_template_server_id").notNull(),
  value: text("value"),
  userId: text("user_id").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  syncStatus: text("sync_status", { enum: ["pending", "synced"] }).default(
    "synced"
  ),
});

export const attachments = sqliteTable("attachments", {
  clientId: text("client_id").primaryKey(),
  serverId: text("server_id"),
  fieldResponseClientId: text("field_response_client_id").notNull(),
  localUri: text("local_uri"),
  storageId: text("storage_id"),
  storageUrl: text("storage_url"),
  fileName: text("file_name").notNull(),
  fileType: text("file_type").notNull(),
  mimeType: text("mime_type").notNull(),
  fileSize: integer("file_size").notNull(),
  userId: text("user_id").notNull(),
  uploadStatus: text("upload_status", {
    enum: ["pending", "uploading", "uploaded", "failed"],
  }).default("pending"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  syncStatus: text("sync_status", { enum: ["pending", "synced"] }).default(
    "pending"
  ),
});

export const syncQueue = sqliteTable("sync_queue", {
  id: text("id").primaryKey(),
  tableName: text("table_name").notNull(),
  operation: text("operation", { enum: ["create", "update", "upload"] }).notNull(),
  recordClientId: text("record_client_id").notNull(),
  payload: text("payload").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  retryCount: integer("retry_count").default(0),
});

export const syncMetadata = sqliteTable("sync_metadata", {
  id: text("id").primaryKey(),
  tableName: text("table_name").notNull().unique(),
  lastSyncTimestamp: integer("last_sync_timestamp", { mode: "timestamp" }),
  initialSyncComplete: integer("initial_sync_complete", {
    mode: "boolean",
  }).default(false),
});
