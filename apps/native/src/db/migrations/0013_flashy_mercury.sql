CREATE TABLE `work_order_day_services` (
	`server_id` text PRIMARY KEY NOT NULL,
	`work_order_day_server_id` text NOT NULL,
	`service_server_id` text NOT NULL,
	`service_name` text NOT NULL,
	`order` integer NOT NULL
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_task_instances` (
	`client_id` text PRIMARY KEY NOT NULL,
	`server_id` text,
	`work_order_day_server_id` text NOT NULL,
	`day_task_template_server_id` text,
	`work_order_day_service_server_id` text,
	`service_task_template_server_id` text,
	`task_template_server_id` text NOT NULL,
	`user_id` text NOT NULL,
	`instance_label` text,
	`status` text NOT NULL,
	`is_orphaned` integer DEFAULT false,
	`orphaned_at` integer,
	`started_at` integer,
	`completed_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`sync_status` text DEFAULT 'synced'
);
--> statement-breakpoint
INSERT INTO `__new_task_instances`("client_id", "server_id", "work_order_day_server_id", "day_task_template_server_id", "work_order_day_service_server_id", "service_task_template_server_id", "task_template_server_id", "user_id", "instance_label", "status", "is_orphaned", "orphaned_at", "started_at", "completed_at", "created_at", "updated_at", "sync_status") SELECT "client_id", "server_id", "work_order_day_server_id", "day_task_template_server_id", "work_order_day_service_server_id", "service_task_template_server_id", "task_template_server_id", "user_id", "instance_label", "status", "is_orphaned", "orphaned_at", "started_at", "completed_at", "created_at", "updated_at", "sync_status" FROM `task_instances`;--> statement-breakpoint
DROP TABLE `task_instances`;--> statement-breakpoint
ALTER TABLE `__new_task_instances` RENAME TO `task_instances`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
ALTER TABLE `day_task_templates` ADD `work_order_day_service_server_id` text;--> statement-breakpoint
ALTER TABLE `day_task_templates` ADD `service_task_template_server_id` text;--> statement-breakpoint
ALTER TABLE `day_task_templates` ADD `is_standalone` integer DEFAULT false NOT NULL;