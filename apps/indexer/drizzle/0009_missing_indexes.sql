CREATE INDEX "app_by_owner_id_idx" ON "ecp_indexer_schema"."app" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "uass_by_user_id_idx" ON "ecp_indexer_schema"."user_auth_session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "uass_by_last_used_idx" ON "ecp_indexer_schema"."user_auth_session" USING btree ("last_used_at");--> statement-breakpoint
CREATE INDEX "uassrt_by_expires_at_idx" ON "ecp_indexer_schema"."user_auth_session_siwe_refresh_token" USING btree ("expires_at");