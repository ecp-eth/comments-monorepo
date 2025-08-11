-- Custom SQL migration file, put your code below! --
-- This function retrieves schemas that match the UUID pattern and:
-- - Checks if they have a table named comments (invalid schema - should be droppped)
-- - Checks if they have a table named comment with a created_at column (valid schema)
--   - if so it returns the latest comment created at timestamp or null (in the case of null, schema should be dropped)
CREATE OR REPLACE FUNCTION get_comment_schema_status()
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

-- This function drops schemas that:
-- - are older than a specified number of days (default 30)
-- - has dry run enabled by default (pass false if you want to really drop them)
CREATE OR REPLACE FUNCTION drop_schemas_older_than(
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
        FROM get_comment_schema_status()
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

-- This function drops invalid schemas that:
-- - have no comments table
-- - has dry run enabled by default (pass false if you want to really drop them)
CREATE OR REPLACE FUNCTION drop_invalid_schemas(
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
        FROM get_comment_schema_status()
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

-- This function drops empty schemas that:
-- - have no comments table
-- - have no latest comment created at timestamp (i.e., no comments)
-- - has dry run enabled by default (pass false if you want to really drop them)
CREATE OR REPLACE FUNCTION drop_empty_schemas(
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
        FROM get_comment_schema_status()
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