CREATE TABLE "broadcast_app_indexer_offchain"."user_farcaster_mini_app_settings" (
	"app_id" text NOT NULL,
	"user_address" text NOT NULL,
	"user_fid" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"notifications_enabled" boolean DEFAULT false NOT NULL,
	CONSTRAINT "user_farcaster_mini_app_settings_app_id_user_address_user_fid_pk" PRIMARY KEY("app_id","user_address","user_fid")
);
--> statement-breakpoint
CREATE INDEX "ufmas_user_address_idx" ON "broadcast_app_indexer_offchain"."user_farcaster_mini_app_settings" USING btree ("user_address");--> statement-breakpoint
CREATE INDEX "ufmas_user_fid_idx" ON "broadcast_app_indexer_offchain"."user_farcaster_mini_app_settings" USING btree ("user_fid");