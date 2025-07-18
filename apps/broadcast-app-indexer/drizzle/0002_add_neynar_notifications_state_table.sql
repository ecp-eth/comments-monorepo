CREATE TYPE "public"."neynar_notification_service_queue_status" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TABLE "broadcast_app_indexer_offchain"."neynar_notification_service_queue" (
	"comment_id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"pending_subscriber_fids" integer[] NOT NULL,
	"status" "neynar_notification_service_queue_status" DEFAULT 'pending' NOT NULL,
	"notification" jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "broadcast_app_indexer_offchain"."channel_subscription" RENAME COLUMN "user_id" TO "user_fid";--> statement-breakpoint
ALTER TABLE "broadcast_app_indexer_offchain"."channel_subscription" DROP CONSTRAINT "channel_subscription_channel_id_user_id_pk";--> statement-breakpoint
ALTER TABLE "broadcast_app_indexer_offchain"."channel_subscription" ADD CONSTRAINT "channel_subscription_channel_id_user_fid_pk" PRIMARY KEY("channel_id","user_fid");--> statement-breakpoint
CREATE INDEX "neynar_notification_service_queue_updated_at_idx" ON "broadcast_app_indexer_offchain"."neynar_notification_service_queue" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "neynar_notification_service_queue_status_idx" ON "broadcast_app_indexer_offchain"."neynar_notification_service_queue" USING btree ("status");--> statement-breakpoint
CREATE INDEX "channel_subscription_notifications_enabled_idx" ON "broadcast_app_indexer_offchain"."channel_subscription" USING btree ("notifications_enabled");