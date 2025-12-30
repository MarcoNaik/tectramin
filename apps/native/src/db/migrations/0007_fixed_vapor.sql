CREATE TABLE `lookup_entities` (
	`server_id` text PRIMARY KEY NOT NULL,
	`entity_type_server_id` text NOT NULL,
	`value` text NOT NULL,
	`label` text NOT NULL,
	`parent_entity_server_id` text,
	`display_order` integer NOT NULL,
	`is_active` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `lookup_entity_types` (
	`server_id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`parent_entity_type_server_id` text,
	`is_active` integer NOT NULL
);
