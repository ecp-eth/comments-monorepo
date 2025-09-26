ALTER TABLE "ecp_indexer_schema"."app_webhook_delivery" DROP CONSTRAINT "awd_dedupe_deliveries_uq";--> statement-breakpoint
ALTER TABLE "ecp_indexer_schema"."app_webhook_delivery" ADD COLUMN "retry_number" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX "awd_by_event_retry_number_idx" ON "ecp_indexer_schema"."app_webhook_delivery" USING btree ("event_id","retry_number");--> statement-breakpoint
ALTER TABLE "ecp_indexer_schema"."app_webhook_delivery" ADD CONSTRAINT "awd_dedupe_deliveries_uq" UNIQUE("app_webhook_id","event_id","retry_number");--> statement-breakpoint
DROP INDEX IF EXISTS "ecp_indexer_schema"."awd_by_webhook_created_at_range_idx";--> statement-breakpoint
CREATE INDEX "awd_by_webhook_created_at_range_idx" ON "ecp_indexer_schema"."app_webhook_delivery" USING btree ("app_webhook_id","created_at") INCLUDE ("status");--> statement-breakpoint
