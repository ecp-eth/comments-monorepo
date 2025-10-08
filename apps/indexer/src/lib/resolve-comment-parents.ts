import type { Hex } from "@ecp.eth/sdk/core";
import { db } from "../services/db";
import type { CommentSelectType } from "../../ponder.schema";
import { type PgTransaction } from "drizzle-orm/pg-core";
import { schema } from "../../schema";
import { sql, type ExtractTablesWithRelations } from "drizzle-orm";
import type { NodePgQueryResultHKT } from "drizzle-orm/node-postgres";

export async function resolveCommentParents(
  parentId: Hex,
  tx?: PgTransaction<
    NodePgQueryResultHKT,
    typeof schema,
    ExtractTablesWithRelations<typeof schema>
  >,
): Promise<Pick<CommentSelectType, "id" | "author" | "app">[]> {
  const connection = tx ?? db;

  const { rows } = await connection.execute<{
    id: Hex;
    author: Hex;
    app: Hex;
  }>(
    sql`
      WITH RECURSIVE comment_parents AS (
        SELECT id, author, app, parent_id FROM ${schema.comment}
        WHERE id = ${parentId}
        UNION ALL
        SELECT c.id, c.author, c.app, c.parent_id FROM ${schema.comment} c
        INNER JOIN comment_parents cp ON c.id = cp.parent_id
      )

      SELECT * FROM comment_parents;
    `,
  );

  return rows;
}
