CREATE TABLE `sync_metadata` (
	`id` text PRIMARY KEY NOT NULL,
	`table_name` text NOT NULL,
	`last_sync_timestamp` integer,
	`initial_sync_complete` integer DEFAULT false
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sync_metadata_table_name_unique` ON `sync_metadata` (`table_name`);--> statement-breakpoint
CREATE TABLE `sync_queue` (
	`id` text PRIMARY KEY NOT NULL,
	`table_name` text NOT NULL,
	`operation` text NOT NULL,
	`record_client_id` text NOT NULL,
	`payload` text NOT NULL,
	`created_at` integer NOT NULL,
	`retry_count` integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`client_id` text PRIMARY KEY NOT NULL,
	`server_id` text,
	`text` text NOT NULL,
	`is_completed` integer DEFAULT false NOT NULL,
	`user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`sync_status` text DEFAULT 'synced'
);
