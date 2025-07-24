import {
  type Generated,
  type Kysely,
  type Selectable,
  sql,
  type MigrationProvider,
} from "kysely";
import type { Hex } from "viem";
import type { CommentModerationStatus, CommentReportStatus } from "./types";
import type { CommentModerationLabelsWithScore } from "../services/types";
import { ECP_INDEXER_SCHEMA_NAME } from "./db";

export type MutedAccountsTable = {
  account: Hex;
  created_at: Generated<Date>;
  reason: string | null;
};

export type ApiKeysTable = {
  id: string;
  public_key: string;
  name: string;
  created_at: Date;
  last_used_at: Date | null;
};

export type CommentModerationStatusesTable = {
  comment_id: Hex;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
  moderation_status: CommentModerationStatus;
};

export type CommentClassificationResultsTable = {
  comment_id: Hex;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
  labels: CommentModerationLabelsWithScore;
  score: number;
};

export type CommentReportsTable = {
  id: Generated<string>;
  comment_id: Hex;
  reportee: Hex;
  message: string;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
  status: CommentReportStatus;
};

export type CommentReportSelectType = Selectable<CommentReportsTable>;

export type IndexerSchemaDB = {
  muted_accounts: MutedAccountsTable;
  api_keys: ApiKeysTable;
  comment_moderation_statuses: CommentModerationStatusesTable;
  comment_classification_results: CommentClassificationResultsTable;
  comment_reports: CommentReportsTable;
};

export type MutedAccountSelect = Selectable<MutedAccountsTable>;

class StaticMigrationsProvider implements MigrationProvider {
  async getMigrations() {
    return {
      "2025_03_07_16_00_00_initial": {
        up: async (db: Kysely<IndexerSchemaDB>) => {
          await db.schema
            .createTable("muted_accounts")
            .addColumn("account", "text", (col) => col.primaryKey())
            .addColumn("created_at", "timestamp", (col) =>
              col.notNull().defaultTo(sql`now()`),
            )
            .addColumn("reason", "text")
            .execute();
        },
        down: async (db: Kysely<IndexerSchemaDB>) => {
          await db.schema.dropTable("muted_accounts").execute();
        },
      },
      "2025_03_10_09_20_00_auth_keys": {
        up: async (db: Kysely<IndexerSchemaDB>) => {
          await db.schema
            .createTable("api_keys")
            .addColumn("id", "text", (col) => col.primaryKey())
            .addColumn("public_key", "text", (col) => col.notNull())
            .addColumn("name", "text", (col) => col.notNull().unique())
            .addColumn("created_at", "timestamp", (col) => col.notNull())
            .addColumn("last_used_at", "timestamp")
            .execute();
        },
        down: async (db: Kysely<IndexerSchemaDB>) => {
          await db.schema.dropTable("api_keys").execute();
        },
      },
      "2025_03_26_10_52_00_comments_moderation": {
        up: async (db: Kysely<IndexerSchemaDB>) => {
          await db.schema
            .createTable("comment_moderation_statuses")
            .addColumn("comment_id", "text", (col) => col.primaryKey())
            .addColumn("created_at", "timestamptz", (col) =>
              col.notNull().defaultTo(sql`now()`),
            )
            .addColumn("updated_at", "timestamptz", (col) =>
              col.notNull().defaultTo(sql`now()`),
            )
            .addColumn("moderation_status", "text", (col) =>
              col
                .notNull()
                .defaultTo("pending")
                .check(
                  sql`moderation_status IN ('pending', 'approved', 'rejected')`,
                ),
            )
            .execute();
        },
        down: async (db: Kysely<IndexerSchemaDB>) => {
          await db.schema.dropTable("comment_moderation_statuses").execute();
        },
      },
      "2025_07_09_13_37_00_comments_classification": {
        up: async (db: Kysely<IndexerSchemaDB>) => {
          await db.schema
            .createTable("comment_classification_results")
            .addColumn("comment_id", "text", (col) => col.primaryKey())
            .addColumn("created_at", "timestamptz", (col) =>
              col.notNull().defaultTo(sql`now()`),
            )
            .addColumn("updated_at", "timestamptz", (col) =>
              col.notNull().defaultTo(sql`now()`),
            )
            .addColumn("labels", "jsonb", (col) => col.notNull())
            .addColumn("score", "double precision", (col) => col.notNull())
            .execute();
        },
        down: async (db: Kysely<IndexerSchemaDB>) => {
          await db.schema.dropTable("comment_classification_results").execute();
        },
      },
      "2025_07_09_15_53_00_comment_reports": {
        up: async (db: Kysely<IndexerSchemaDB>) => {
          await db.schema
            .createTable("comment_reports")
            .addColumn("id", "text", (col) =>
              col.primaryKey().defaultTo(sql`gen_random_uuid()`),
            )
            .addColumn("comment_id", "text", (col) => col.notNull())
            .addColumn("created_at", "timestamptz", (col) =>
              col.notNull().defaultTo(sql`now()`),
            )
            .addColumn("updated_at", "timestamptz", (col) =>
              col.notNull().defaultTo(sql`now()`),
            )
            .addColumn("reportee", "text", (col) => col.notNull())
            .addColumn("message", "text", (col) => col.notNull())
            .addColumn("status", "text", (col) =>
              col
                .notNull()
                .defaultTo("pending")
                .check(sql`status IN ('pending', 'resolved', 'closed')`),
            )
            .execute();

          await db.schema
            .createIndex("comment_reports_by_status_idx")
            .on("comment_reports")
            .column("status")
            .execute();

          await db.schema
            .createIndex("comment_reports_by_created_at_idx")
            .on("comment_reports")
            .column("created_at")
            .execute();
        },
        down: async (db: Kysely<IndexerSchemaDB>) => {
          await db.schema.dropTable("comment_reports").execute();
        },
      },
      "2025_07_24_09_18_00_add_maintenance_functions": {
        up: async (db: Kysely<IndexerSchemaDB>) => {
          await db.executeQuery(
            sql`
            CREATE OR REPLACE FUNCTION ${sql.ref(ECP_INDEXER_SCHEMA_NAME)}.get_comment_schema_status()
            RETURNS TABLE (
                schema_name TEXT,
                has_comment_table BOOLEAN,
                latest_comment_created_at TIMESTAMPTZ
            )
            LANGUAGE plpgsql
            AS $$
            DECLARE
                sname TEXT;
                sql TEXT;
                rec RECORD;
            BEGIN
                FOR sname IN
                    SELECT nspname
                    FROM pg_namespace
                    WHERE nspname ~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
                LOOP
                    -- CASE 1: Has 'comments' table → invalid
                    IF EXISTS (
                        SELECT 1
                        FROM information_schema.tables
                        WHERE table_schema = sname
                          AND table_name = 'comments'
                    ) THEN
                        schema_name := sname;
                        has_comment_table := false;
                        latest_comment_created_at := NULL;
                        RETURN NEXT;

                    -- CASE 2: Has 'comment' table
                    ELSIF EXISTS (
                        SELECT 1
                        FROM information_schema.tables
                        WHERE table_schema = sname
                          AND table_name = 'comment'
                    ) THEN
                        IF EXISTS (
                            SELECT 1
                            FROM information_schema.columns
                            WHERE table_schema = sname
                              AND table_name = 'comment'
                              AND column_name = 'created_at'
                        ) THEN
                            BEGIN
                                sql := format(
                                    'SELECT created_at FROM %I.comment ORDER BY created_at DESC LIMIT 1',
                                    sname
                                );
                                EXECUTE sql INTO rec;
                                schema_name := sname;
                                has_comment_table := true;
                                latest_comment_created_at := rec.created_at;
                                RETURN NEXT;
                            EXCEPTION
                                WHEN OTHERS THEN
                                    RAISE NOTICE 'Error querying %.comment: %', sname, SQLERRM;
                                    schema_name := sname;
                                    has_comment_table := false;
                                    latest_comment_created_at := NULL;
                                    RETURN NEXT;
                            END;
                        ELSE
                            -- comment table but no created_at column
                            schema_name := sname;
                            has_comment_table := false;
                            latest_comment_created_at := NULL;
                            RETURN NEXT;
                        END IF;
                    END IF;
                END LOOP;
            END;
            $$;
          `.compile(db),
          );

          await db.executeQuery(
            sql`
            CREATE OR REPLACE FUNCTION ${sql.ref(ECP_INDEXER_SCHEMA_NAME)}.drop_schemas_older_than(
                days_threshold INTEGER,
                dry_run BOOLEAN DEFAULT true
            )
            RETURNS void
            LANGUAGE plpgsql
            AS $$
            DECLARE
                cutoff TIMESTAMPTZ := now() - (days_threshold || ' days')::INTERVAL;
                rec RECORD;
                drop_stmt TEXT;
            BEGIN
                FOR rec IN
                    SELECT schema_name
                    FROM ${sql.ref(ECP_INDEXER_SCHEMA_NAME)}.get_comment_schema_status()
                    WHERE has_comment_table = true
                      AND latest_comment_created_at IS NOT NULL
                      AND latest_comment_created_at < cutoff
                LOOP
                    drop_stmt := format('DROP SCHEMA IF EXISTS %I CASCADE;', rec.schema_name);

                    IF dry_run THEN
                        RAISE NOTICE '[DRY RUN] Would drop schema: %', rec.schema_name;
                    ELSE
                        EXECUTE drop_stmt;
                        RAISE NOTICE 'Dropped schema: %', rec.schema_name;
                    END IF;
                END LOOP;
            END;
            $$;
            `.compile(db),
          );

          await db.executeQuery(
            sql`
              CREATE OR REPLACE FUNCTION ${sql.ref(ECP_INDEXER_SCHEMA_NAME)}.drop_invalid_schemas(
                  dry_run BOOLEAN DEFAULT true
              )
              RETURNS void
              LANGUAGE plpgsql
              AS $$
              DECLARE
                  rec RECORD;
                  drop_stmt TEXT;
              BEGIN
                  FOR rec IN
                      SELECT schema_name
                      FROM ${sql.ref(ECP_INDEXER_SCHEMA_NAME)}.get_comment_schema_status()
                      WHERE has_comment_table = false
                  LOOP
                      drop_stmt := format('DROP SCHEMA IF EXISTS %I CASCADE;', rec.schema_name);

                      IF dry_run THEN
                          RAISE NOTICE '[DRY RUN] Would drop invalid schema: %', rec.schema_name;
                      ELSE
                          EXECUTE drop_stmt;
                          RAISE NOTICE 'Dropped invalid schema: %', rec.schema_name;
                      END IF;
                  END LOOP;
              END;
              $$;
            `.compile(db),
          );

          await db.executeQuery(
            sql`
            CREATE OR REPLACE FUNCTION ${sql.ref(ECP_INDEXER_SCHEMA_NAME)}.drop_empty_schemas(
                dry_run BOOLEAN DEFAULT true
            )
            RETURNS void
            LANGUAGE plpgsql
            AS $$
            DECLARE
                rec RECORD;
                drop_stmt TEXT;
            BEGIN
                FOR rec IN
                    SELECT schema_name
                    FROM ${sql.ref(ECP_INDEXER_SCHEMA_NAME)}.get_comment_schema_status()
                    WHERE has_comment_table = true
                      AND latest_comment_created_at IS NULL
                LOOP
                    drop_stmt := format('DROP SCHEMA IF EXISTS %I CASCADE;', rec.schema_name);

                    IF dry_run THEN
                        RAISE NOTICE '[DRY RUN] Would drop empty schema: %', rec.schema_name;
                    ELSE
                        EXECUTE drop_stmt;
                        RAISE NOTICE 'Dropped empty schema: %', rec.schema_name;
                    END IF;
                END LOOP;
            END;
            $$;
            `.compile(db),
          );
        },
        down: async (db: Kysely<IndexerSchemaDB>) => {
          await db.executeQuery(
            sql`
            DROP FUNCTION IF EXISTS ${sql.ref(ECP_INDEXER_SCHEMA_NAME)}.get_comment_schema_status();
          `.compile(db),
          );

          await db.executeQuery(
            sql`
              DROP FUNCTION IF EXISTS ${sql.ref(ECP_INDEXER_SCHEMA_NAME)}.drop_schemas_older_than(INTEGER, BOOLEAN);
            `.compile(db),
          );

          await db.executeQuery(
            sql`
              DROP FUNCTION IF EXISTS ${sql.ref(ECP_INDEXER_SCHEMA_NAME)}.drop_invalid_schemas(BOOLEAN);
            `.compile(db),
          );

          await db.executeQuery(
            sql`
              DROP FUNCTION IF EXISTS ${sql.ref(ECP_INDEXER_SCHEMA_NAME)}.drop_empty_schemas(BOOLEAN);
            `.compile(db),
          );
        },
      },
    };
  }
}

export const managementMigrationsProvider = new StaticMigrationsProvider();
