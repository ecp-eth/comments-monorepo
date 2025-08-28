ALTER TABLE "ecp_indexer_schema"."app_webhook_delivery" RENAME COLUMN "attemts_count" TO "attempts_count";--> statement-breakpoint
ALTER TABLE "ecp_indexer_schema"."app_webhook_delivery" ALTER COLUMN "app_webhook_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "ecp_indexer_schema"."app_webhook_delivery" ALTER COLUMN "event_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "ecp_indexer_schema"."app_webhook_delivery_attempt" ALTER COLUMN "app_webhook_delivery_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "ecp_indexer_schema"."app_webhook_delivery" ADD COLUMN "lease_until" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "aws_heads_per_subscription_idx" ON "ecp_indexer_schema"."app_webhook_delivery" USING btree ("app_webhook_id","next_attempt_at","id") WHERE "ecp_indexer_schema"."app_webhook_delivery"."status" IN ('pending', 'processing');--> statement-breakpoint
CREATE INDEX "aws_inflight_idx" ON "ecp_indexer_schema"."app_webhook_delivery" USING btree ("app_webhook_id","status","lease_until") WHERE "ecp_indexer_schema"."app_webhook_delivery"."status" = 'processing';