-- threads has never held a row (the Coach tab arrives with this migration), so the table
-- is rebuilt outright instead of copied through a renamed twin with the foreign keys off.
DROP TABLE `threads`;--> statement-breakpoint
CREATE TABLE `threads` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`kind` text DEFAULT 'chat' NOT NULL,
	`title` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "threads_kind_check" CHECK("threads"."kind" in ('chat', 'weekly-review'))
);
--> statement-breakpoint
CREATE INDEX `threads_user_id_updated_at_idx` ON `threads` (`user_id`,`updated_at`);
