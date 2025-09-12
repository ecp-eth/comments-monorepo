ALTER TABLE "ecp_indexer_schema"."app_webhook_delivery" DROP CONSTRAINT "app_webhook_delivery_app_webhook_id_app_webhook_id_fk";
--> statement-breakpoint
ALTER TABLE "ecp_indexer_schema"."app_webhook_delivery_attempt" DROP CONSTRAINT "app_webhook_delivery_attempt_app_webhook_id_app_webhook_id_fk";
--> statement-breakpoint
ALTER TABLE "ecp_indexer_schema"."app_webhook_delivery_attempt" DROP CONSTRAINT "app_webhook_delivery_attempt_app_webhook_delivery_id_app_webhook_delivery_id_fk";
--> statement-breakpoint
ALTER TABLE "ecp_indexer_schema"."app_webhook_delivery" ALTER COLUMN "event_id" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "ecp_indexer_schema"."app_webhook_delivery_attempt" ALTER COLUMN "app_webhook_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "ecp_indexer_schema"."app_webhook_delivery_attempt" ALTER COLUMN "app_webhook_delivery_id" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "ecp_indexer_schema"."app_webhook_delivery_attempt" ALTER COLUMN "app_webhook_delivery_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "ecp_indexer_schema"."app_webhook" ADD COLUMN "owner_id" uuid;--> statement-breakpoint
ALTER TABLE "ecp_indexer_schema"."app_webhook_delivery" ADD COLUMN "owner_id" uuid;--> statement-breakpoint
ALTER TABLE "ecp_indexer_schema"."app_webhook_delivery" ADD COLUMN "app_id" uuid;--> statement-breakpoint
ALTER TABLE "ecp_indexer_schema"."app_webhook_delivery_attempt" ADD COLUMN "owner_id" uuid;--> statement-breakpoint
ALTER TABLE "ecp_indexer_schema"."app_webhook_delivery_attempt" ADD COLUMN "app_id" uuid;--> statement-breakpoint
ALTER TABLE "ecp_indexer_schema"."app_webhook_delivery_attempt" ADD COLUMN "event_id" bigint;--> statement-breakpoint
ALTER TABLE "ecp_indexer_schema"."app_webhook" ADD CONSTRAINT "app_webhook_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "ecp_indexer_schema"."user"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ecp_indexer_schema"."app_webhook_delivery" ADD CONSTRAINT "app_webhook_delivery_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "ecp_indexer_schema"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ecp_indexer_schema"."app_webhook_delivery" ADD CONSTRAINT "app_webhook_delivery_app_id_app_id_fk" FOREIGN KEY ("app_id") REFERENCES "ecp_indexer_schema"."app"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ecp_indexer_schema"."app_webhook_delivery" ADD CONSTRAINT "app_webhook_delivery_app_webhook_id_app_webhook_id_fk" FOREIGN KEY ("app_webhook_id") REFERENCES "ecp_indexer_schema"."app_webhook"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ecp_indexer_schema"."app_webhook_delivery_attempt" ADD CONSTRAINT "app_webhook_delivery_attempt_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "ecp_indexer_schema"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ecp_indexer_schema"."app_webhook_delivery_attempt" ADD CONSTRAINT "app_webhook_delivery_attempt_app_id_app_id_fk" FOREIGN KEY ("app_id") REFERENCES "ecp_indexer_schema"."app"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ecp_indexer_schema"."app_webhook_delivery_attempt" ADD CONSTRAINT "app_webhook_delivery_attempt_event_id_event_outbox_id_fk" FOREIGN KEY ("event_id") REFERENCES "ecp_indexer_schema"."event_outbox"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ecp_indexer_schema"."app_webhook_delivery_attempt" ADD CONSTRAINT "app_webhook_delivery_attempt_app_webhook_id_app_webhook_id_fk" FOREIGN KEY ("app_webhook_id") REFERENCES "ecp_indexer_schema"."app_webhook"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ecp_indexer_schema"."app_webhook_delivery_attempt" ADD CONSTRAINT "app_webhook_delivery_attempt_app_webhook_delivery_id_app_webhook_delivery_id_fk" FOREIGN KEY ("app_webhook_delivery_id") REFERENCES "ecp_indexer_schema"."app_webhook_delivery"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "awd_by_owner_app_idx" ON "ecp_indexer_schema"."app_webhook_delivery" USING btree ("owner_id","app_id");--> statement-breakpoint
CREATE INDEX "awd_by_owner_webhook_idx" ON "ecp_indexer_schema"."app_webhook_delivery" USING btree ("owner_id","app_webhook_id");--> statement-breakpoint
CREATE INDEX "awd_by_owner_app_webhook_idx" ON "ecp_indexer_schema"."app_webhook_delivery" USING btree ("owner_id","app_id","app_webhook_id");--> statement-breakpoint
CREATE INDEX "awd_by_webhook_created_at_range_idx" ON "ecp_indexer_schema"."app_webhook_delivery" USING btree ("app_webhook_id","created_at");--> statement-breakpoint
CREATE INDEX "awd_by_webhook_status_created_at_range_idx" ON "ecp_indexer_schema"."app_webhook_delivery" USING btree ("app_webhook_id","status","created_at");--> statement-breakpoint
CREATE INDEX "awda_by_owner_idx" ON "ecp_indexer_schema"."app_webhook_delivery_attempt" USING btree ("owner_id","attempted_at");--> statement-breakpoint
CREATE INDEX "awda_by_owner_app_idx" ON "ecp_indexer_schema"."app_webhook_delivery_attempt" USING btree ("owner_id","app_id","attempted_at");--> statement-breakpoint
CREATE INDEX "awda_by_owner_webhook_idx" ON "ecp_indexer_schema"."app_webhook_delivery_attempt" USING btree ("owner_id","app_webhook_id","attempted_at");--> statement-breakpoint
CREATE INDEX "awda_by_owner_app_webhook_idx" ON "ecp_indexer_schema"."app_webhook_delivery_attempt" USING btree ("owner_id","app_id","app_webhook_id","attempted_at");--> statement-breakpoint
CREATE INDEX "awda_by_webhook_idx" ON "ecp_indexer_schema"."app_webhook_delivery_attempt" USING btree ("app_webhook_id","attempted_at");