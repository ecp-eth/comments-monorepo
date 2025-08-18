ALTER TABLE "broadcast_app_indexer_offchain"."channel_subscription" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "broadcast_app_indexer_offchain"."channel_subscription" CASCADE;--> statement-breakpoint
ALTER TABLE "broadcast_app_indexer_offchain"."channel_subscription_farcaster_notification_settings" DROP CONSTRAINT "channel_subscription_farcaster_notification_settings_channel_id_app_id_user_address_fk";
--> statement-breakpoint
DROP INDEX "broadcast_app_indexer_offchain"."channel_subscription_farcaster_notification_settings_enabled_by_channel_app_idx";--> statement-breakpoint
ALTER TABLE "broadcast_app_indexer_offchain"."channel_subscription_farcaster_notification_settings" DROP CONSTRAINT "channel_subscription_farcaster_notification_settings_pk";--> statement-breakpoint
ALTER TABLE "broadcast_app_indexer_offchain"."channel_subscription_farcaster_notification_settings" ADD CONSTRAINT "csfns_settings_pk" PRIMARY KEY("channel_id","app_id","user_address","user_fid");--> statement-breakpoint
CREATE INDEX "csfn_enabled_notification_by_channel_app_idx" ON "broadcast_app_indexer_offchain"."channel_subscription_farcaster_notification_settings" USING btree ("channel_id","app_id","notifications_enabled") WHERE "broadcast_app_indexer_offchain"."channel_subscription_farcaster_notification_settings"."notifications_enabled" = true;