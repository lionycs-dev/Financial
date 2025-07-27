ALTER TABLE "products" ADD COLUMN "product_stream_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "weight" numeric(5, 4) NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_product_stream_id_revenue_streams_id_fk" FOREIGN KEY ("product_stream_id") REFERENCES "public"."revenue_streams"("id") ON DELETE no action ON UPDATE no action;