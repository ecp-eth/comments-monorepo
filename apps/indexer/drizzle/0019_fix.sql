ALTER TABLE "ecp_indexer_schema"."app_webhook" ALTER COLUMN "owner_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "ecp_indexer_schema"."app_webhook_delivery" ALTER COLUMN "owner_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "ecp_indexer_schema"."app_webhook_delivery" ALTER COLUMN "app_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "ecp_indexer_schema"."app_webhook_delivery" ALTER COLUMN "app_webhook_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "ecp_indexer_schema"."app_webhook_delivery_attempt" ALTER COLUMN "owner_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "ecp_indexer_schema"."app_webhook_delivery_attempt" ALTER COLUMN "app_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "ecp_indexer_schema"."app_webhook_delivery_attempt" ALTER COLUMN "app_webhook_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "ecp_indexer_schema"."app_webhook_delivery_attempt" ALTER COLUMN "app_webhook_delivery_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "ecp_indexer_schema"."app_webhook_delivery_attempt" ALTER COLUMN "event_id" SET NOT NULL;