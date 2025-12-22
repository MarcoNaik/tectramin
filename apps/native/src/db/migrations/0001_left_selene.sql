CREATE TABLE `attachments` (
	`client_id` text PRIMARY KEY NOT NULL,
	`server_id` text,
	`field_response_client_id` text NOT NULL,
	`local_uri` text,
	`storage_id` text,
	`storage_url` text,
	`file_name` text NOT NULL,
	`file_type` text NOT NULL,
	`mime_type` text NOT NULL,
	`file_size` integer NOT NULL,
	`user_id` text NOT NULL,
	`upload_status` text DEFAULT 'pending',
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`sync_status` text DEFAULT 'pending'
);
