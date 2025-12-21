import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const tasks = sqliteTable("tasks", {
  clientId: text("client_id").primaryKey(),
  serverId: text("server_id"),
  text: text("text").notNull(),
  isCompleted: integer("is_completed", { mode: "boolean" })
    .notNull()
    .default(false),
  userId: text("user_id").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  syncStatus: text("sync_status", { enum: ["pending", "synced"] }).default(
    "synced"
  ),
});

export const syncQueue = sqliteTable("sync_queue", {
  id: text("id").primaryKey(),
  tableName: text("table_name").notNull(),
  operation: text("operation", { enum: ["create", "update"] }).notNull(),
  recordClientId: text("record_client_id").notNull(),
  payload: text("payload").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  retryCount: integer("retry_count").default(0),
});

export const syncMetadata = sqliteTable("sync_metadata", {
  id: text("id").primaryKey(),
  tableName: text("table_name").notNull().unique(),
  lastSyncTimestamp: integer("last_sync_timestamp", { mode: "timestamp" }),
  initialSyncComplete: integer("initial_sync_complete", { mode: "boolean" }).default(
    false
  ),
});
