ALTER TABLE "products" DROP CONSTRAINT "products_stream_id_revenue_streams_id_fk";
--> statement-breakpoint
ALTER TABLE "client_groups" DROP COLUMN "first_purchase_mix";--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "stream_id";--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "entry_weight";