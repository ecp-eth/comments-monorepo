ALTER TABLE "ecp_indexer_schema"."app_webhook_delivery" DROP CONSTRAINT "app_webhook_delivery_owner_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "ecp_indexer_schema"."app_webhook_delivery" DROP CONSTRAINT "app_webhook_delivery_app_id_app_id_fk";
--> statement-breakpoint
ALTER TABLE "ecp_indexer_schema"."app_webhook_delivery" DROP CONSTRAINT "app_webhook_delivery_app_webhook_id_app_webhook_id_fk";
--> statement-breakpoint
ALTER TABLE "ecp_indexer_schema"."app_webhook_delivery_attempt" DROP CONSTRAINT "app_webhook_delivery_attempt_owner_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "ecp_indexer_schema"."app_webhook_delivery_attempt" DROP CONSTRAINT "app_webhook_delivery_attempt_app_id_app_id_fk";
--> statement-breakpoint
ALTER TABLE "ecp_indexer_schema"."app_webhook_delivery_attempt" DROP CONSTRAINT "app_webhook_delivery_attempt_app_webhook_id_app_webhook_id_fk";
--> statement-breakpoint
ALTER TABLE "ecp_indexer_schema"."app_webhook_delivery_attempt" DROP CONSTRAINT "app_webhook_delivery_attempt_app_webhook_delivery_id_app_webhook_delivery_id_fk";
--> statement-breakpoint
ALTER TABLE "ecp_indexer_schema"."app_webhook_delivery" ADD CONSTRAINT "app_webhook_delivery_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "ecp_indexer_schema"."user"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ecp_indexer_schema"."app_webhook_delivery" ADD CONSTRAINT "app_webhook_delivery_app_id_app_id_fk" FOREIGN KEY ("app_id") REFERENCES "ecp_indexer_schema"."app"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ecp_indexer_schema"."app_webhook_delivery" ADD CONSTRAINT "app_webhook_delivery_app_webhook_id_app_webhook_id_fk" FOREIGN KEY ("app_webhook_id") REFERENCES "ecp_indexer_schema"."app_webhook"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ecp_indexer_schema"."app_webhook_delivery_attempt" ADD CONSTRAINT "app_webhook_delivery_attempt_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "ecp_indexer_schema"."user"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ecp_indexer_schema"."app_webhook_delivery_attempt" ADD CONSTRAINT "app_webhook_delivery_attempt_app_id_app_id_fk" FOREIGN KEY ("app_id") REFERENCES "ecp_indexer_schema"."app"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ecp_indexer_schema"."app_webhook_delivery_attempt" ADD CONSTRAINT "app_webhook_delivery_attempt_app_webhook_id_app_webhook_id_fk" FOREIGN KEY ("app_webhook_id") REFERENCES "ecp_indexer_schema"."app_webhook"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ecp_indexer_schema"."app_webhook_delivery_attempt" ADD CONSTRAINT "app_webhook_delivery_attempt_app_webhook_delivery_id_app_webhook_delivery_id_fk" FOREIGN KEY ("app_webhook_delivery_id") REFERENCES "ecp_indexer_schema"."app_webhook_delivery"("id") ON DELETE cascade ON UPDATE cascade;