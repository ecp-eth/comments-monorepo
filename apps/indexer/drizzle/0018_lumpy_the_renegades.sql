CREATE TABLE "ecp_indexer_schema"."author_short_id" (
	"author_address" text NOT NULL,
	"short_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "author_short_id_pk" PRIMARY KEY("author_address"),
	CONSTRAINT "author_short_id_by_short_id_uq" UNIQUE("short_id")
);
--> statement-breakpoint
CREATE TABLE "ecp_indexer_schema"."comment_short_id" (
	"comment_id" text NOT NULL,
	"short_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "comment_short_id_pk" PRIMARY KEY("comment_id"),
	CONSTRAINT "comment_short_id_by_short_id_uq" UNIQUE("short_id")
);
--> statement-breakpoint
CREATE INDEX "author_short_id_by_short_id_idx" ON "ecp_indexer_schema"."author_short_id" USING btree ("short_id");--> statement-breakpoint
CREATE INDEX "comment_short_id_by_short_id_idx" ON "ecp_indexer_schema"."comment_short_id" USING btree ("short_id");