CREATE TABLE "ecp_indexer_schema"."app" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"owner_id" uuid NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ecp_indexer_schema"."app_signing_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	"app_id" uuid NOT NULL,
	"secret" text NOT NULL,
	CONSTRAINT "ask_one_active_secret_uq" UNIQUE("app_id","revoked_at")
);
--> statement-breakpoint
ALTER TABLE "ecp_indexer_schema"."app" ADD CONSTRAINT "app_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "ecp_indexer_schema"."user"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ecp_indexer_schema"."app_signing_keys" ADD CONSTRAINT "app_signing_keys_app_id_app_id_fk" FOREIGN KEY ("app_id") REFERENCES "ecp_indexer_schema"."app"("id") ON DELETE cascade ON UPDATE cascade;