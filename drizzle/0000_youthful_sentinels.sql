CREATE TABLE `lines` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`package_id` integer NOT NULL,
	`slot` integer NOT NULL,
	`type` text NOT NULL,
	`holder_name` text,
	`phone_number` text,
	`sim_reference` text,
	`billing_cycle` text DEFAULT 'monthly' NOT NULL,
	`billing_start` text,
	`notes` text,
	FOREIGN KEY (`package_id`) REFERENCES `packages`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `lines_package_slot_idx` ON `lines` (`package_id`,`slot`);--> statement-breakpoint
CREATE INDEX `lines_package_idx` ON `lines` (`package_id`);--> statement-breakpoint
CREATE TABLE `packages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`notes` text,
	`discount_start` text NOT NULL,
	`discount_end` text,
	`cashback_end` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`line_id` integer NOT NULL,
	`period` text NOT NULL,
	`paid_at` text NOT NULL,
	FOREIGN KEY (`line_id`) REFERENCES `lines`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payments_line_period_idx` ON `payments` (`line_id`,`period`);--> statement-breakpoint
CREATE INDEX `payments_line_idx` ON `payments` (`line_id`);