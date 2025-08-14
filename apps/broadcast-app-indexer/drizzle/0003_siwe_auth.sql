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
	"user_id" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "broadcast_app_indexer_offchain"."auth_siwe_refresh_token" ADD CONSTRAINT "auth_siwe_refresh_token_session_id_auth_siwe_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "broadcast_app_indexer_offchain"."auth_siwe_session"("id") ON DELETE cascade ON UPDATE cascade;