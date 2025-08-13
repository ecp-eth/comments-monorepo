CREATE SCHEMA IF NOT EXISTS "ecp_indexer_schema";
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ecp_indexer_schema"."api_keys" (
	"id" text PRIMARY KEY NOT NULL,
	"public_key" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone,
	CONSTRAINT "api_keys_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ecp_indexer_schema"."comment_classification_results" (
	"comment_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"labels" jsonb NOT NULL,
	"score" double precision NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "comment_classification_results_comment_id_revision_pk" PRIMARY KEY("comment_id","revision")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ecp_indexer_schema"."comment_moderation_statuses" (
	"comment_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"moderation_status" text DEFAULT 'pending' NOT NULL,
	"revision" integer NOT NULL,
	CONSTRAINT "comment_moderation_statuses_comment_id_revision_pk" PRIMARY KEY("comment_id","revision"),
	CONSTRAINT "moderation_status_enum" CHECK ("ecp_indexer_schema"."comment_moderation_statuses"."moderation_status" IN ('pending', 'approved', 'rejected'))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ecp_indexer_schema"."comment_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"comment_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reportee" text NOT NULL,
	"message" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	CONSTRAINT "comment_report_status_enum" CHECK ("ecp_indexer_schema"."comment_reports"."status" IN ('pending', 'resolved', 'closed'))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ecp_indexer_schema"."muted_accounts" (
	"account" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reason" text
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "comment_reports_by_status_idx" ON "ecp_indexer_schema"."comment_reports" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "comment_reports_by_created_at_idx" ON "ecp_indexer_schema"."comment_reports" USING btree ("created_at");