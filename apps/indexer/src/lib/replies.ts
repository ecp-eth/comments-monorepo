import { Hex } from "@ecp.eth/sdk/types";
import { Context } from "ponder:registry";
import { sql } from "ponder";

/**
 * Finds the root comment's id from current comment's parent id
 */
export async function getRootCommentId(
  parentCommentId: Hex,
  db: Context["db"]["sql"]
): Promise<Hex | undefined> {
  const cte = sql<{ id: Hex }[]>`
    WITH RECURSIVE comment_path AS (
      SELECT id, parent_id FROM comment WHERE id = ${parentCommentId}
      UNION ALL
      SELECT c.id, c.parent_id FROM comment c
      INNER JOIN comment_path cp ON c.id = cp.parent_id
    )

    SELECT id FROM comment_path WHERE parent_id IS NULL
  `;

  // drizzle has incorrect result type
  const result = (await db.execute(cte)) as unknown as [Hex][];

  return result[0]?.[0] ?? undefined;
}
