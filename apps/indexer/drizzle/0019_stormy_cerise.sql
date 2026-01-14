CREATE TABLE "ecp_indexer_schema"."approval_expiration_check_state" (
	"id" text PRIMARY KEY DEFAULT 'singleton' NOT NULL,
	"last_checked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "approval_expiration_check_state_last_checked_idx" ON "ecp_indexer_schema"."approval_expiration_check_state" USING btree ("last_checked_at");