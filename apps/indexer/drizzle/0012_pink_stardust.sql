ALTER TABLE "ecp_indexer_schema"."comment_classification_results" RENAME COLUMN "revision" TO "comment_revision";--> statement-breakpoint
ALTER TABLE "ecp_indexer_schema"."comment_moderation_statuses" RENAME COLUMN "revision" TO "comment_revision";--> statement-breakpoint
ALTER TABLE "ecp_indexer_schema"."comment_reference_resolution_results" RENAME COLUMN "revision" TO "comment_revision";--> statement-breakpoint
ALTER TABLE "ecp_indexer_schema"."comment_classification_results" DROP CONSTRAINT "comment_classification_results_comment_id_revision_pk";--> statement-breakpoint
ALTER TABLE "ecp_indexer_schema"."comment_moderation_statuses" DROP CONSTRAINT "comment_moderation_statuses_comment_id_revision_pk";--> statement-breakpoint
ALTER TABLE "ecp_indexer_schema"."comment_reference_resolution_results" DROP CONSTRAINT "comment_reference_resolution_results_comment_id_revision_pk";--> statement-breakpoint
ALTER TABLE "ecp_indexer_schema"."comment_classification_results" ADD CONSTRAINT "comment_classification_results_comment_id_comment_revision_pk" PRIMARY KEY("comment_id","comment_revision");--> statement-breakpoint
ALTER TABLE "ecp_indexer_schema"."comment_moderation_statuses" ADD CONSTRAINT "comment_moderation_statuses_comment_id_comment_revision_pk" PRIMARY KEY("comment_id","comment_revision");--> statement-breakpoint
ALTER TABLE "ecp_indexer_schema"."comment_reference_resolution_results" ADD CONSTRAINT "comment_reference_resolution_results_comment_id_comment_revision_pk" PRIMARY KEY("comment_id","comment_revision");