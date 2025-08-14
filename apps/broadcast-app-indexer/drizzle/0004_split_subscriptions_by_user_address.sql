ALTER TABLE "broadcast_app_indexer_offchain"."channel_subscription" ADD COLUMN "user_address" text NOT NULL;--> statement-breakpoint
ALTER TABLE "broadcast_app_indexer_offchain"."channel_subscription" DROP CONSTRAINT "channel_subscription_channel_id_app_id_user_fid_pk";--> statement-breakpoint
ALTER TABLE "broadcast_app_indexer_offchain"."channel_subscription" ADD CONSTRAINT "channel_subscription_channel_id_app_id_user_address_pk" PRIMARY KEY("channel_id","app_id","user_address");--> statement-breakpoint
ALTER TABLE "broadcast_app_indexer_offchain"."channel_subscription" DROP COLUMN "user_fid";
CREATE TABLE "broadcast_app_indexer_offchain"."channel_subscription_farcaster_notification_settings" (
	"channel_id" numeric(78, 0) NOT NULL,
	"app_id" text NOT NULL,
	"user_address" text NOT NULL,
	"user_fid" integer NOT NULL,
	"notifications_enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "broadcast_app_indexer_offchain"."channel_subscription_farcaster_notification_settings" ADD CONSTRAINT "channel_subscription_farcaster_notification_settings_channel_id_app_id_user_address_fk" FOREIGN KEY ("channel_id","app_id","user_address") REFERENCES "broadcast_app_indexer_offchain"."channel_subscription"("channel_id","app_id","user_address") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint