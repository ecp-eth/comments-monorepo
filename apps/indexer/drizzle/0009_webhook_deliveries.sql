CREATE TABLE "ecp_indexer_schema"."app_webhook_delivery" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"app_webhook_id" uuid,
	"event_id" bigserial,
	"status" text DEFAULT 'pending' NOT NULL,
	"attemts_count" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	CONSTRAINT "awd_dedupe_deliveries_uq" UNIQUE("app_webhook_id","event_id")
);
--> statement-breakpoint
CREATE TABLE "ecp_indexer_schema"."app_webhook_delivery_attempt" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"attempted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"app_webhook_delivery_id" bigserial,
	"response_status" integer,
	"response_ms" integer,
	"error" text
);
--> statement-breakpoint
ALTER TABLE "ecp_indexer_schema"."app_webhook_delivery" ADD CONSTRAINT "app_webhook_delivery_app_webhook_id_app_webhook_id_fk" FOREIGN KEY ("app_webhook_id") REFERENCES "ecp_indexer_schema"."app_webhook"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ecp_indexer_schema"."app_webhook_delivery" ADD CONSTRAINT "app_webhook_delivery_event_id_event_outbox_id_fk" FOREIGN KEY ("event_id") REFERENCES "ecp_indexer_schema"."event_outbox"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ecp_indexer_schema"."app_webhook_delivery_attempt" ADD CONSTRAINT "app_webhook_delivery_attempt_app_webhook_delivery_id_app_webhook_delivery_id_fk" FOREIGN KEY ("app_webhook_delivery_id") REFERENCES "ecp_indexer_schema"."app_webhook_delivery"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "aws_by_status_and_next_attempt_at_idx" ON "ecp_indexer_schema"."app_webhook_delivery" USING btree ("status","next_attempt_at");--> statement-breakpoint
CREATE INDEX "awd_by_webhook_idx" ON "ecp_indexer_schema"."app_webhook_delivery" USING btree ("app_webhook_id");--> statement-breakpoint
CREATE INDEX "aw_by_event_idx" ON "ecp_indexer_schema"."app_webhook" USING gin ("event_filter");--> statement-breakpoint
CREATE INDEX "aw_by_paused_status_idx" ON "ecp_indexer_schema"."app_webhook" USING btree ("paused");