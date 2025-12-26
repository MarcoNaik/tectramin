CREATE TABLE `field_conditions` (
	`server_id` text PRIMARY KEY NOT NULL,
	`child_field_server_id` text NOT NULL,
	`parent_field_server_id` text NOT NULL,
	`operator` text NOT NULL,
	`value` text NOT NULL,
	`condition_group` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `field_templates` ADD `condition_logic` text;