-- Create the enum first
CREATE TYPE "public"."client_group_type" AS ENUM('B2B', 'B2C', 'DTC');

-- Add the column as nullable first
ALTER TABLE "client_groups" ADD COLUMN "type" "client_group_type";

-- Update existing rows with a default value (B2B)
UPDATE "client_groups" SET "type" = 'B2B' WHERE "type" IS NULL;

-- Now make the column NOT NULL
ALTER TABLE "client_groups" ALTER COLUMN "type" SET NOT NULL;