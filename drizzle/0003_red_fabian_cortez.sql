CREATE TABLE `package_invoices` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`package_id` integer NOT NULL,
	`period` text NOT NULL,
	`amount_halalas` integer,
	`paid_at` text,
	FOREIGN KEY (`package_id`) REFERENCES `packages`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `package_invoices_package_period_idx` ON `package_invoices` (`package_id`,`period`);--> statement-breakpoint
CREATE INDEX `package_invoices_package_idx` ON `package_invoices` (`package_id`);--> statement-breakpoint
ALTER TABLE `packages` ADD `bill_cycle` text DEFAULT 'monthly' NOT NULL;