ALTER TABLE "ecp_indexer_schema"."app_signing_keys" RENAME TO "app_secret_keys";--> statement-breakpoint
ALTER TABLE "ecp_indexer_schema"."app_secret_keys" DROP CONSTRAINT "app_signing_keys_app_id_app_id_fk";
--> statement-breakpoint
ALTER TABLE "ecp_indexer_schema"."app_secret_keys" ADD CONSTRAINT "app_secret_keys_app_id_app_id_fk" FOREIGN KEY ("app_id") REFERENCES "ecp_indexer_schema"."app"("id") ON DELETE cascade ON UPDATE cascade;