CREATE TABLE `task_dependencies` (
	`server_id` text PRIMARY KEY NOT NULL,
	`dependent_task_server_id` text NOT NULL,
	`prerequisite_task_server_id` text NOT NULL,
	`work_order_day_server_id` text NOT NULL
);
