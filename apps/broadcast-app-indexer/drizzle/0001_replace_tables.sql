CREATE TABLE "broadcast_app_indexer_offchain"."app_channel_subscription" (
	"channel_id" numeric(78, 0) NOT NULL,
	"app_id" text NOT NULL,
	"user_fid" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"notifications_enabled" boolean DEFAULT false NOT NULL,
	CONSTRAINT "app_channel_subscription_channel_id_app_id_user_fid_pk" PRIMARY KEY("channel_id","app_id","user_fid")
);
--> statement-breakpoint
CREATE TABLE "broadcast_app_indexer_offchain"."neynar_notification_service_notifications_queue" (
	"comment_id" text NOT NULL,
	"app_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"pending_subscriber_fids" integer[] NOT NULL,
	"status" "broadcast_app_indexer_offchain"."neynar_notification_service_queue_status" DEFAULT 'pending' NOT NULL,
	"notification_uuid" uuid DEFAULT gen_random_uuid() NOT NULL,
	"notification" jsonb NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "neynar_notification_service_notifications_queue_comment_id_app_id_pk" PRIMARY KEY("comment_id","app_id")
);
--> statement-breakpoint
DROP TABLE "broadcast_app_indexer_offchain"."channel_subscription" CASCADE;--> statement-breakpoint
DROP TABLE "broadcast_app_indexer_offchain"."neynar_notification_service_queue" CASCADE;--> statement-breakpoint
CREATE INDEX "channel_subscription_notifications_enabled_idx" ON "broadcast_app_indexer_offchain"."app_channel_subscription" USING btree ("notifications_enabled");--> statement-breakpoint
CREATE INDEX "neynar_notification_service_queue_created_at_idx" ON "broadcast_app_indexer_offchain"."neynar_notification_service_notifications_queue" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "neynar_notification_service_queue_status_idx" ON "broadcast_app_indexer_offchain"."neynar_notification_service_notifications_queue" USING btree ("status");