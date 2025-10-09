CREATE TABLE "ecp_indexer_schema"."app_notification" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"notification_type" text NOT NULL,
	"notification_id" bigint NOT NULL,
	"app_id" uuid NOT NULL,
	"parent_id" text NOT NULL,
	"entity_id" text NOT NULL,
	"app_signer" text NOT NULL,
	"author_address" text NOT NULL,
	"recipient_address" text NOT NULL,
	"seen_at" timestamp with time zone,
	CONSTRAINT "an_dedupe_notifications_uq" UNIQUE("notification_id","app_id")
);
--> statement-breakpoint
CREATE TABLE "ecp_indexer_schema"."notification_outbox" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	"notification_uid" text NOT NULL,
	"notification_type" text NOT NULL,
	"author_address" text NOT NULL,
	"recipient_address" text NOT NULL,
	"parent_id" text NOT NULL,
	"entity_id" text NOT NULL,
	"app_signer" text NOT NULL,
	CONSTRAINT "notification_outbox_notificationUid_unique" UNIQUE("notification_uid")
);
--> statement-breakpoint
ALTER TABLE "ecp_indexer_schema"."app_notification" ADD CONSTRAINT "app_notification_notification_id_notification_outbox_id_fk" FOREIGN KEY ("notification_id") REFERENCES "ecp_indexer_schema"."notification_outbox"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ecp_indexer_schema"."app_notification" ADD CONSTRAINT "app_notification_app_id_app_id_fk" FOREIGN KEY ("app_id") REFERENCES "ecp_indexer_schema"."app"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "an_list_all_idx" ON "ecp_indexer_schema"."app_notification" USING btree ("app_id","recipient_address","created_at" desc,"id" desc);--> statement-breakpoint
CREATE INDEX "an_list_seen_idx" ON "ecp_indexer_schema"."app_notification" USING btree ("app_id","recipient_address","created_at" desc,"id" desc) WHERE "ecp_indexer_schema"."app_notification"."seen_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "an_list_unseen_idx" ON "ecp_indexer_schema"."app_notification" USING btree ("app_id","recipient_address","created_at" desc,"id" desc) WHERE "ecp_indexer_schema"."app_notification"."seen_at" IS NULL;--> statement-breakpoint
CREATE INDEX "an_grouped_idx" ON "ecp_indexer_schema"."app_notification" USING btree ("app_id","recipient_address","created_at" desc,"notification_type" asc,"parent_id" asc,"id" desc);--> statement-breakpoint
CREATE INDEX "an_grouped_seen_idx" ON "ecp_indexer_schema"."app_notification" USING btree ("app_id","recipient_address","created_at" desc,"notification_type" asc,"parent_id" asc,"id" desc) WHERE "ecp_indexer_schema"."app_notification"."seen_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "an_grouped_unseen_idx" ON "ecp_indexer_schema"."app_notification" USING btree ("app_id","recipient_address","created_at" desc,"notification_type" asc,"parent_id" asc,"id" desc) WHERE "ecp_indexer_schema"."app_notification"."seen_at" IS NULL;--> statement-breakpoint
CREATE INDEX "an_grouped_latest_idx" ON "ecp_indexer_schema"."app_notification" USING btree ("app_id","recipient_address","notification_type" asc,"parent_id" asc,"created_at" desc,"id" desc);--> statement-breakpoint
CREATE INDEX "an_grouped_latest_seen_idx" ON "ecp_indexer_schema"."app_notification" USING btree ("app_id","recipient_address","notification_type" asc,"parent_id" asc,"created_at" desc,"id" desc) WHERE "ecp_indexer_schema"."app_notification"."seen_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "an_grouped_latest_unseen_idx" ON "ecp_indexer_schema"."app_notification" USING btree ("app_id","recipient_address","notification_type" asc,"parent_id" asc,"created_at" desc,"id" desc) WHERE "ecp_indexer_schema"."app_notification"."seen_at" IS NULL;--> statement-breakpoint
CREATE INDEX "nt_by_created_at_unprocessed_idx" ON "ecp_indexer_schema"."notification_outbox" USING btree ("created_at") WHERE "ecp_indexer_schema"."notification_outbox"."processed_at" IS NULL;--> statement-breakpoint
CREATE INDEX "app_by_id_created_at_idx" ON "ecp_indexer_schema"."app" USING btree ("id","created_at");


CREATE OR REPLACE FUNCTION ecp_indexer_schema.notify_new_notifications_in_outbox() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  PERFORM pg_notify('notification_events', '');
  RETURN NULL;
END
$$;

CREATE TRIGGER notification_outbox_notify_new_notifications_trigger
AFTER INSERT ON ecp_indexer_schema.notification_outbox
FOR EACH STATEMENT
EXECUTE FUNCTION ecp_indexer_schema.notify_new_notifications_in_outbox();