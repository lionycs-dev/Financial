DROP TABLE "conversion_rules" CASCADE;--> statement-breakpoint
DROP TABLE "users" CASCADE;--> statement-breakpoint
ALTER TABLE "client_groups" DROP COLUMN "acv_growth_rate";--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "cac";