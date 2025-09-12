DROP INDEX "ecp_indexer_schema"."awda_by_webhook_time_idx";--> statement-breakpoint
DROP INDEX "ecp_indexer_schema"."awda_by_delivery_idx";--> statement-breakpoint
CREATE INDEX "aw_by_id_and_app_id_idx" ON "ecp_indexer_schema"."app_webhook" USING btree ("id","app_id");