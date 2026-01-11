ALTER TABLE `day_task_templates` DROP COLUMN `is_standalone`;--> statement-breakpoint
ALTER TABLE `task_instances` DROP COLUMN `is_orphaned`;--> statement-breakpoint
ALTER TABLE `task_instances` DROP COLUMN `orphaned_at`;