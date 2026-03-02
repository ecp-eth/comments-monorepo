CREATE TABLE "ecp_indexer_schema"."channel_hourly_volume" (
	"channel_id" bigint NOT NULL,
	"hour_timestamp" timestamp with time zone NOT NULL,
	"tx_count" integer DEFAULT 0 NOT NULL,
	"gas_total" numeric DEFAULT '0' NOT NULL,
	"value_total" numeric DEFAULT '0' NOT NULL,
	"volume_total" numeric DEFAULT '0' NOT NULL,
	CONSTRAINT "channel_hourly_volume_channel_id_hour_timestamp_pk" PRIMARY KEY("channel_id","hour_timestamp")
);
--> statement-breakpoint
CREATE INDEX "chv_by_hour_timestamp_idx" ON "ecp_indexer_schema"."channel_hourly_volume" USING btree ("hour_timestamp");--> statement-breakpoint
CREATE INDEX "chv_by_channel_id_hour_timestamp_idx" ON "ecp_indexer_schema"."channel_hourly_volume" USING btree ("channel_id","hour_timestamp");