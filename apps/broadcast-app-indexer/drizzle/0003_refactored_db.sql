CREATE TABLE "broadcast_app_indexer_offchain"."auth_siwe_refresh_token" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_used" boolean DEFAULT false NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "broadcast_app_indexer_offchain"."auth_siwe_session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "broadcast_app_indexer_offchain"."channel_subscription_farcaster_notification_settings" (
	"channel_id" numeric(78, 0) NOT NULL,
	"app_id" text NOT NULL,
	"client_fid" integer NOT NULL,
	"user_address" text NOT NULL,
	"user_fid" integer NOT NULL,
	"notifications_enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "csfns_settings_pk" PRIMARY KEY("channel_id","client_fid","app_id","user_address","user_fid")
);
--> statement-breakpoint
CREATE TABLE "broadcast_app_indexer_offchain"."user_farcaster_mini_app_settings" (
	"app_id" text NOT NULL,
	"client_fid" integer NOT NULL,
	"user_address" text NOT NULL,
	"user_fid" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"notifications_enabled" boolean DEFAULT false NOT NULL,
	CONSTRAINT "user_farcaster_mini_app_settings_app_id_client_fid_user_address_user_fid_pk" PRIMARY KEY("app_id","client_fid","user_address","user_fid")
);
--> statement-breakpoint
DROP TABLE "broadcast_app_indexer_offchain"."channel_subscription" CASCADE;--> statement-breakpoint
ALTER TABLE "broadcast_app_indexer_offchain"."auth_siwe_refresh_token" ADD CONSTRAINT "auth_siwe_refresh_token_session_id_auth_siwe_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "broadcast_app_indexer_offchain"."auth_siwe_session"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "broadcast_app_indexer_offchain"."channel_subscription_farcaster_notification_settings" ADD CONSTRAINT "channel_subscription_farcaster_notification_settings_app_id_client_fid_user_address_user_fid_user_farcaster_mini_app_settings_app_id_client_fid_user_address_user_fid_fk" FOREIGN KEY ("app_id","client_fid","user_address","user_fid") REFERENCES "broadcast_app_indexer_offchain"."user_farcaster_mini_app_settings"("app_id","client_fid","user_address","user_fid") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "csfn_enabled_notification_by_channel_app_idx" ON "broadcast_app_indexer_offchain"."channel_subscription_farcaster_notification_settings" USING btree ("channel_id","app_id") WHERE "broadcast_app_indexer_offchain"."channel_subscription_farcaster_notification_settings"."notifications_enabled" = true;--> statement-breakpoint
CREATE INDEX "ufmas_user_address_idx" ON "broadcast_app_indexer_offchain"."user_farcaster_mini_app_settings" USING btree ("user_address");--> statement-breakpoint
CREATE INDEX "ufmas_user_fid_idx" ON "broadcast_app_indexer_offchain"."user_farcaster_mini_app_settings" USING btree ("user_fid");