CREATE TABLE "ecp_indexer_schema"."event_outbox" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	"event_uid" text NOT NULL,
	"event_type" text NOT NULL,
	"aggregate_type" text NOT NULL,
	"aggregate_id" text NOT NULL,
	"payload" jsonb NOT NULL,
	CONSTRAINT "event_outbox_eventUid_unique" UNIQUE("event_uid")
);
--> statement-breakpoint
CREATE INDEX "event_outbox_by_processed_at_idx" ON "ecp_indexer_schema"."event_outbox" USING btree ("processed_at");