-- Step 1: Add the column as nullable
ALTER TABLE "ecp_indexer_schema"."comment_moderation_statuses" ADD COLUMN "updated_by" text;

-- Step 2: Set default value for existing rows
UPDATE "ecp_indexer_schema"."comment_moderation_statuses" SET "updated_by" = 'premoderation' WHERE "updated_by" IS NULL;

-- Step 3: Set default value for future rows
ALTER TABLE "ecp_indexer_schema"."comment_moderation_statuses" ALTER COLUMN "updated_by" SET DEFAULT 'premoderation';

-- Step 4: Make the column NOT NULL
ALTER TABLE "ecp_indexer_schema"."comment_moderation_statuses" ALTER COLUMN "updated_by" SET NOT NULL;
