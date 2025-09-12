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
CREATE TABLE "ecp_indexer_schema"."app_webhook" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"app_id" uuid NOT NULL,
	"owner_id" uuid NOT NULL,
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
CREATE TABLE "ecp_indexer_schema"."app_webhook_delivery" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"lease_until" timestamp with time zone,
	"owner_id" uuid NOT NULL,
	"app_id" uuid NOT NULL,
	"app_webhook_id" uuid NOT NULL,
	"event_id" bigint NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts_count" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	CONSTRAINT "awd_dedupe_deliveries_uq" UNIQUE("app_webhook_id","event_id")
);
--> statement-breakpoint
CREATE TABLE "ecp_indexer_schema"."app_webhook_delivery_attempt" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"attempted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"attempt_number" integer DEFAULT 1 NOT NULL,
	"owner_id" uuid NOT NULL,
	"app_id" uuid NOT NULL,
	"app_webhook_id" uuid NOT NULL,
	"app_webhook_delivery_id" bigint NOT NULL,
	"event_id" bigint NOT NULL,
	"response_status" integer NOT NULL,
	"response_ms" integer NOT NULL,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "ecp_indexer_schema"."event_outbox" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	"event_uid" text NOT NULL,
	"event_type" text NOT NULL,
	"aggregate_type" text NOT NULL,
	"aggregate_id" text NOT NULL,
	"payload" jsonb NOT NULL,
	"payload_size" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "event_outbox_eventUid_unique" UNIQUE("event_uid")
);
--> statement-breakpoint
CREATE TABLE "ecp_indexer_schema"."user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"role" text DEFAULT 'user' NOT NULL
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
ALTER TABLE "ecp_indexer_schema"."app" ADD CONSTRAINT "app_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "ecp_indexer_schema"."user"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ecp_indexer_schema"."app_signing_keys" ADD CONSTRAINT "app_signing_keys_app_id_app_id_fk" FOREIGN KEY ("app_id") REFERENCES "ecp_indexer_schema"."app"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ecp_indexer_schema"."app_webhook" ADD CONSTRAINT "app_webhook_app_id_app_id_fk" FOREIGN KEY ("app_id") REFERENCES "ecp_indexer_schema"."app"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ecp_indexer_schema"."app_webhook" ADD CONSTRAINT "app_webhook_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "ecp_indexer_schema"."user"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ecp_indexer_schema"."app_webhook_delivery" ADD CONSTRAINT "app_webhook_delivery_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "ecp_indexer_schema"."user"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ecp_indexer_schema"."app_webhook_delivery" ADD CONSTRAINT "app_webhook_delivery_app_id_app_id_fk" FOREIGN KEY ("app_id") REFERENCES "ecp_indexer_schema"."app"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ecp_indexer_schema"."app_webhook_delivery" ADD CONSTRAINT "app_webhook_delivery_app_webhook_id_app_webhook_id_fk" FOREIGN KEY ("app_webhook_id") REFERENCES "ecp_indexer_schema"."app_webhook"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ecp_indexer_schema"."app_webhook_delivery" ADD CONSTRAINT "app_webhook_delivery_event_id_event_outbox_id_fk" FOREIGN KEY ("event_id") REFERENCES "ecp_indexer_schema"."event_outbox"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ecp_indexer_schema"."app_webhook_delivery_attempt" ADD CONSTRAINT "app_webhook_delivery_attempt_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "ecp_indexer_schema"."user"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ecp_indexer_schema"."app_webhook_delivery_attempt" ADD CONSTRAINT "app_webhook_delivery_attempt_app_id_app_id_fk" FOREIGN KEY ("app_id") REFERENCES "ecp_indexer_schema"."app"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ecp_indexer_schema"."app_webhook_delivery_attempt" ADD CONSTRAINT "app_webhook_delivery_attempt_app_webhook_id_app_webhook_id_fk" FOREIGN KEY ("app_webhook_id") REFERENCES "ecp_indexer_schema"."app_webhook"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ecp_indexer_schema"."app_webhook_delivery_attempt" ADD CONSTRAINT "app_webhook_delivery_attempt_app_webhook_delivery_id_app_webhook_delivery_id_fk" FOREIGN KEY ("app_webhook_delivery_id") REFERENCES "ecp_indexer_schema"."app_webhook_delivery"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ecp_indexer_schema"."app_webhook_delivery_attempt" ADD CONSTRAINT "app_webhook_delivery_attempt_event_id_event_outbox_id_fk" FOREIGN KEY ("event_id") REFERENCES "ecp_indexer_schema"."event_outbox"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ecp_indexer_schema"."user_auth_credentials" ADD CONSTRAINT "user_auth_credentials_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "ecp_indexer_schema"."user"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ecp_indexer_schema"."user_auth_session" ADD CONSTRAINT "user_auth_session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "ecp_indexer_schema"."user"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ecp_indexer_schema"."user_auth_session" ADD CONSTRAINT "user_auth_session_user_auth_credentials_id_user_auth_credentials_id_fk" FOREIGN KEY ("user_auth_credentials_id") REFERENCES "ecp_indexer_schema"."user_auth_credentials"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ecp_indexer_schema"."user_auth_session_siwe_refresh_token" ADD CONSTRAINT "user_auth_session_siwe_refresh_token_user_auth_session_id_user_auth_session_id_fk" FOREIGN KEY ("user_auth_session_id") REFERENCES "ecp_indexer_schema"."user_auth_session"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "aw_by_event_idx" ON "ecp_indexer_schema"."app_webhook" USING gin ("event_filter");--> statement-breakpoint
CREATE INDEX "aw_by_paused_status_idx" ON "ecp_indexer_schema"."app_webhook" USING btree ("paused");--> statement-breakpoint
CREATE INDEX "aw_by_id_and_app_id_idx" ON "ecp_indexer_schema"."app_webhook" USING btree ("id","app_id");--> statement-breakpoint
CREATE INDEX "aws_by_status_and_next_attempt_at_idx" ON "ecp_indexer_schema"."app_webhook_delivery" USING btree ("status","next_attempt_at");--> statement-breakpoint
CREATE INDEX "awd_by_webhook_idx" ON "ecp_indexer_schema"."app_webhook_delivery" USING btree ("app_webhook_id");--> statement-breakpoint
CREATE INDEX "awd_by_owner_app_idx" ON "ecp_indexer_schema"."app_webhook_delivery" USING btree ("owner_id","app_id");--> statement-breakpoint
CREATE INDEX "awd_by_owner_webhook_idx" ON "ecp_indexer_schema"."app_webhook_delivery" USING btree ("owner_id","app_webhook_id");--> statement-breakpoint
CREATE INDEX "awd_by_owner_app_webhook_idx" ON "ecp_indexer_schema"."app_webhook_delivery" USING btree ("owner_id","app_id","app_webhook_id");--> statement-breakpoint
CREATE INDEX "awd_by_webhook_created_at_range_idx" ON "ecp_indexer_schema"."app_webhook_delivery" USING btree ("app_webhook_id","created_at");--> statement-breakpoint
CREATE INDEX "awd_by_webhook_status_created_at_range_idx" ON "ecp_indexer_schema"."app_webhook_delivery" USING btree ("app_webhook_id","status","created_at");--> statement-breakpoint
CREATE INDEX "aws_heads_per_subscription_idx" ON "ecp_indexer_schema"."app_webhook_delivery" USING btree ("app_webhook_id","next_attempt_at","id") WHERE "ecp_indexer_schema"."app_webhook_delivery"."status" IN ('pending', 'processing');--> statement-breakpoint
CREATE INDEX "aws_inflight_idx" ON "ecp_indexer_schema"."app_webhook_delivery" USING btree ("app_webhook_id","status","lease_until") WHERE "ecp_indexer_schema"."app_webhook_delivery"."status" = 'processing';--> statement-breakpoint
CREATE INDEX "awda_by_owner_idx" ON "ecp_indexer_schema"."app_webhook_delivery_attempt" USING btree ("owner_id","attempted_at");--> statement-breakpoint
CREATE INDEX "awda_by_owner_app_idx" ON "ecp_indexer_schema"."app_webhook_delivery_attempt" USING btree ("owner_id","app_id","attempted_at");--> statement-breakpoint
CREATE INDEX "awda_by_owner_webhook_idx" ON "ecp_indexer_schema"."app_webhook_delivery_attempt" USING btree ("owner_id","app_webhook_id","attempted_at");--> statement-breakpoint
CREATE INDEX "awda_by_owner_app_webhook_idx" ON "ecp_indexer_schema"."app_webhook_delivery_attempt" USING btree ("owner_id","app_id","app_webhook_id","attempted_at");--> statement-breakpoint
CREATE INDEX "awda_by_webhook_idx" ON "ecp_indexer_schema"."app_webhook_delivery_attempt" USING btree ("app_webhook_id","attempted_at");--> statement-breakpoint
CREATE INDEX "awda_failed_partial_idx" ON "ecp_indexer_schema"."app_webhook_delivery_attempt" USING btree ("response_status") WHERE "ecp_indexer_schema"."app_webhook_delivery_attempt"."response_status" < 200 OR "ecp_indexer_schema"."app_webhook_delivery_attempt"."response_status" > 399;--> statement-breakpoint
CREATE INDEX "event_outbox_by_processed_at_idx" ON "ecp_indexer_schema"."event_outbox" USING btree ("processed_at");