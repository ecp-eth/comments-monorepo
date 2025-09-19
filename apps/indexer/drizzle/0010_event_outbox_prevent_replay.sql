DROP INDEX "ecp_indexer_schema"."aw_by_event_idx";--> statement-breakpoint
ALTER TABLE "ecp_indexer_schema"."app_webhook" ADD COLUMN "event_activations" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "ecp_indexer_schema"."app_webhook" ADD COLUMN "event_outbox_position" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX "aw_subscriptions_by_event_idx" ON "ecp_indexer_schema"."app_webhook" USING gin ("event_filter") WHERE "ecp_indexer_schema"."app_webhook"."paused" = FALSE;--> statement-breakpoint
CREATE INDEX "aw_by_created_at_idx" ON "ecp_indexer_schema"."app_webhook" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "aw_by_outbox_position_idx" ON "ecp_indexer_schema"."app_webhook" USING btree ("event_outbox_position");