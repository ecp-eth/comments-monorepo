import type { ExtractTablesWithRelations } from "drizzle-orm";
import { DatabaseError } from "pg";
import type { NodePgQueryResultHKT } from "drizzle-orm/node-postgres";
import type { PgTransaction } from "drizzle-orm/pg-core";
import { schema } from "../../schema";
import type { Hex } from "viem";

export type ShortID = `0x${string}...${string}`;

const DEFAULT_SHORT_ID_PREFIX_AND_SUFFIX_LENGTH = 3;

export async function generateCommentShortId(
  commentId: Hex,
  tx: PgTransaction<
    NodePgQueryResultHKT,
    typeof schema,
    ExtractTablesWithRelations<typeof schema>
  >,
): Promise<ShortID | Hex> {
  const lowercasedCommentId = commentId.toLowerCase() as Hex;
  const normalizedCommentId = lowercasedCommentId.slice(2);

  for (
    let i = DEFAULT_SHORT_ID_PREFIX_AND_SUFFIX_LENGTH;
    i < normalizedCommentId.length - DEFAULT_SHORT_ID_PREFIX_AND_SUFFIX_LENGTH;
    i++
  ) {
    const prefix = normalizedCommentId.slice(0, i);
    const suffix = normalizedCommentId.slice(-i);
    const shortId: ShortID = `0x${prefix}...${suffix}`;

    try {
      await tx.insert(schema.commentShortIds).values({
        commentId: lowercasedCommentId,
        shortId,
      });

      return shortId;
    } catch (error) {
      if (error instanceof DatabaseError && error.code === "23505") {
        // if the error comes from unique constraint violation on commentId column, then we already have a short id for this comment
        // so we just need to get it
        if (error.constraint === "comment_short_id_pk") {
          const existingCommentShortId = await tx.query.commentShortIds
            .findFirst({
              where(fields, operators) {
                return operators.eq(fields.commentId, lowercasedCommentId);
              },
            })
            .execute();

          if (!existingCommentShortId) {
            throw new Error(`Failed to find short id for comment ${commentId}`);
          }

          return existingCommentShortId.shortId;
        }

        // if the error comes from unique constraint violation on shortId column, then we need to generate different short id
        if (error.constraint === "comment_short_id_by_short_id_uq") {
          continue; // jump to longer short id prefix and suffix
        }
      }

      throw error;
    }
  }

  throw new Error(`Failed to generate short id for comment ${commentId}`);
}

export async function generateAuthorShortId(
  authorAddress: Hex,
  tx: PgTransaction<
    NodePgQueryResultHKT,
    typeof schema,
    ExtractTablesWithRelations<typeof schema>
  >,
): Promise<ShortID | Hex> {
  const lowercasedAuthorAddress = authorAddress.toLowerCase() as Hex;
  const normalizedAuthorAddress = lowercasedAuthorAddress.slice(2);

  for (
    let i = DEFAULT_SHORT_ID_PREFIX_AND_SUFFIX_LENGTH;
    i <
    normalizedAuthorAddress.length - DEFAULT_SHORT_ID_PREFIX_AND_SUFFIX_LENGTH;
    i++
  ) {
    const prefix = normalizedAuthorAddress.slice(0, i);
    const suffix = normalizedAuthorAddress.slice(-i);
    const shortId: ShortID = `0x${prefix}...${suffix}`;

    try {
      await tx.insert(schema.authorShortIds).values({
        authorAddress: lowercasedAuthorAddress,
        shortId,
      });

      return shortId;
    } catch (error) {
      if (error instanceof DatabaseError && error.code === "23505") {
        // if the error comes from unique constraint violation on authorAddress column, then we already have a short id for this author
        // so we just need to get it
        if (error.constraint === "author_short_id_pk") {
          const existingAuthorShortId = await tx.query.authorShortIds
            .findFirst({
              where(fields, operators) {
                return operators.eq(
                  fields.authorAddress,
                  lowercasedAuthorAddress,
                );
              },
            })
            .execute();

          if (!existingAuthorShortId) {
            throw new Error(
              `Failed to find short id for author ${authorAddress}`,
            );
          }

          return existingAuthorShortId.shortId;
        }

        // if the error comes from unique constraint violation on shortId column, then we need to generate different short id
        if (error.constraint === "author_short_id_by_short_id_uq") {
          continue; // jump to longer short id prefix and suffix
        }
      }

      throw error;
    }
  }

  throw new Error(`Failed to generate short id for author ${authorAddress}`);
}
