CREATE TABLE "ecp_indexer_schema"."app_webhook" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"app_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"auth" jsonb DEFAULT '{"type":"no-auth"}'::jsonb NOT NULL,
	"event_filter" text[] DEFAULT '{}' NOT NULL,
	"paused" boolean DEFAULT false NOT NULL,
	"paused_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "ecp_indexer_schema"."app_webhook" ADD CONSTRAINT "app_webhook_app_id_app_id_fk" FOREIGN KEY ("app_id") REFERENCES "ecp_indexer_schema"."app"("id") ON DELETE cascade ON UPDATE cascade;