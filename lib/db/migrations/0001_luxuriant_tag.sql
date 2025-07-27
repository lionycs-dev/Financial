CREATE TYPE "public"."frequency" AS ENUM('Monthly', 'Quarterly', 'SemiAnnual', 'Annual', 'OneTime', 'Custom');--> statement-breakpoint
CREATE TYPE "public"."invoice_timing" AS ENUM('Immediate', 'Upfront', 'Net30', 'Net60', 'Custom');--> statement-breakpoint
CREATE TYPE "public"."revenue_type" AS ENUM('Subscription', 'RepeatPurchase', 'SinglePurchase', 'RevenueOnly');--> statement-breakpoint
CREATE TABLE "client_groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"starting_customers" integer NOT NULL,
	"churn_rate" numeric(5, 4) NOT NULL,
	"acv_growth_rate" numeric(5, 4) NOT NULL,
	"first_purchase_mix" json NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversion_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_group_id" integer NOT NULL,
	"from_product_id" integer NOT NULL,
	"to_product_id" integer NOT NULL,
	"after_months" integer NOT NULL,
	"probability" numeric(5, 4) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pricing_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"name" text NOT NULL,
	"price_formula" text NOT NULL,
	"frequency" "frequency" NOT NULL,
	"custom_frequency" integer,
	"invoice_timing" "invoice_timing" NOT NULL,
	"custom_invoice_timing" integer,
	"lead_to_cash_lag" integer NOT NULL,
	"escalator_pct" numeric(5, 4),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"stream_id" integer NOT NULL,
	"name" text NOT NULL,
	"unit_cost" numeric(10, 2) NOT NULL,
	"entry_weight" numeric(5, 4) NOT NULL,
	"cac" numeric(10, 2) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "revenue_streams" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" "revenue_type" NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "conversion_rules" ADD CONSTRAINT "conversion_rules_client_group_id_client_groups_id_fk" FOREIGN KEY ("client_group_id") REFERENCES "public"."client_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversion_rules" ADD CONSTRAINT "conversion_rules_from_product_id_products_id_fk" FOREIGN KEY ("from_product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversion_rules" ADD CONSTRAINT "conversion_rules_to_product_id_products_id_fk" FOREIGN KEY ("to_product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing_plans" ADD CONSTRAINT "pricing_plans_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_stream_id_revenue_streams_id_fk" FOREIGN KEY ("stream_id") REFERENCES "public"."revenue_streams"("id") ON DELETE no action ON UPDATE no action;