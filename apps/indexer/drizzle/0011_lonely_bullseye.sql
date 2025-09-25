CREATE TABLE "ecp_indexer_schema"."comment_reference_resolution_results" (
	"comment_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"references" jsonb NOT NULL,
	"references_resolution_status" text DEFAULT 'pending' NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "comment_reference_resolution_results_comment_id_revision_pk" PRIMARY KEY("comment_id","revision"),
	CONSTRAINT "comment_reference_resolution_status_enum" CHECK ("ecp_indexer_schema"."comment_reference_resolution_results"."references_resolution_status" IN ('success', 'pending', 'partial', 'failed'))
);
--> statement-breakpoint
CREATE INDEX "comment_reference_resolution_results_by_status_idx" ON "ecp_indexer_schema"."comment_reference_resolution_results" USING btree ("references_resolution_status");