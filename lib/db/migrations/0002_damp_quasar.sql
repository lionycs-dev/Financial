CREATE TABLE "relationships" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_type" text NOT NULL,
	"source_id" integer NOT NULL,
	"target_type" text NOT NULL,
	"target_id" integer NOT NULL,
	"relationship_type" text NOT NULL,
	"properties" json NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
