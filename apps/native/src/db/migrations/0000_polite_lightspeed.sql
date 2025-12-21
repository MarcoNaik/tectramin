CREATE TABLE `day_task_templates` (
	`server_id` text PRIMARY KEY NOT NULL,
	`work_order_day_server_id` text NOT NULL,
	`task_template_server_id` text NOT NULL,
	`task_template_name` text NOT NULL,
	`order` integer NOT NULL,
	`is_required` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `field_responses` (
	`client_id` text PRIMARY KEY NOT NULL,
	`server_id` text,
	`task_instance_client_id` text NOT NULL,
	`field_template_server_id` text NOT NULL,
	`value` text,
	`user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`sync_status` text DEFAULT 'synced'
);
--> statement-breakpoint
CREATE TABLE `field_templates` (
	`server_id` text PRIMARY KEY NOT NULL,
	`task_template_server_id` text NOT NULL,
	`label` text NOT NULL,
	`field_type` text NOT NULL,
	`order` integer NOT NULL,
	`is_required` integer NOT NULL,
	`default_value` text,
	`placeholder` text
);
--> statement-breakpoint
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
CREATE TABLE `task_instances` (
	`client_id` text PRIMARY KEY NOT NULL,
	`server_id` text,
	`work_order_day_server_id` text NOT NULL,
	`day_task_template_server_id` text NOT NULL,
	`task_template_server_id` text NOT NULL,
	`user_id` text NOT NULL,
	`instance_label` text,
	`status` text NOT NULL,
	`started_at` integer,
	`completed_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`sync_status` text DEFAULT 'synced'
);
--> statement-breakpoint
CREATE TABLE `work_order_days` (
	`server_id` text PRIMARY KEY NOT NULL,
	`work_order_server_id` text NOT NULL,
	`work_order_name` text NOT NULL,
	`customer_name` text NOT NULL,
	`faena_name` text NOT NULL,
	`day_date` integer NOT NULL,
	`day_number` integer NOT NULL,
	`status` text NOT NULL,
	`user_id` text NOT NULL
);
