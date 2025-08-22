CREATE TABLE "ecp_indexer_schema"."user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ecp_indexer_schema"."user_auth_credentials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" uuid NOT NULL,
	"method" text NOT NULL,
	"identifier" text NOT NULL,
	CONSTRAINT "user_auth_credentials_by_method_and_identifier_uq" UNIQUE("method","identifier")
);
--> statement-breakpoint
CREATE TABLE "ecp_indexer_schema"."user_auth_session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" uuid NOT NULL,
	"user_auth_credentials_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ecp_indexer_schema"."user_auth_session_siwe_refresh_token" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"user_auth_session_id" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ecp_indexer_schema"."user_auth_credentials" ADD CONSTRAINT "user_auth_credentials_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "ecp_indexer_schema"."user"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ecp_indexer_schema"."user_auth_session" ADD CONSTRAINT "user_auth_session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "ecp_indexer_schema"."user"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ecp_indexer_schema"."user_auth_session" ADD CONSTRAINT "user_auth_session_user_auth_credentials_id_user_auth_credentials_id_fk" FOREIGN KEY ("user_auth_credentials_id") REFERENCES "ecp_indexer_schema"."user_auth_credentials"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ecp_indexer_schema"."user_auth_session_siwe_refresh_token" ADD CONSTRAINT "user_auth_session_siwe_refresh_token_user_auth_session_id_user_auth_session_id_fk" FOREIGN KEY ("user_auth_session_id") REFERENCES "ecp_indexer_schema"."user_auth_session"("id") ON DELETE cascade ON UPDATE cascade;