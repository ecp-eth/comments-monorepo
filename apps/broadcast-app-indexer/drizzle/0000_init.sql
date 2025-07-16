CREATE SCHEMA "broadcast_app_indexer_offchain";
--> statement-breakpoint
CREATE TABLE "broadcast_app_indexer_offchain"."channel_subscription" (
	"channel_id" bigint NOT NULL,
	"user_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "channel_subscription_channel_id_user_id_pk" PRIMARY KEY("channel_id","user_id")
);
