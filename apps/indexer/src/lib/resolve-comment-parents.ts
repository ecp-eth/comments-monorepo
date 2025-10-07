import type { Hex } from "@ecp.eth/sdk/core";
import { db } from "../services/db";
import type { CommentSelectType } from "../../ponder.schema";
import { type PgTransaction } from "drizzle-orm/pg-core";
import { schema } from "../../schema";
import { sql, type ExtractTablesWithRelations } from "drizzle-orm";
import type { NodePgQueryResultHKT } from "drizzle-orm/node-postgres";

export async function resolveCommentParents(
  commentId: Hex,
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
        SELECT id, author, app FROM ${schema.comment}
        WHERE parent_id = ${commentId}
        UNION ALL
        SELECT c.id, c.author, c.app FROM ${schema.comment} c
        INNER JOIN comment_parents cp ON c."parent_id" = cp.id
      )

      SELECT * FROM comment_parents;
    `,
  );

  return rows;
}
