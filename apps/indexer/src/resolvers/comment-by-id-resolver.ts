import type { Hex } from "@ecp.eth/sdk/core/schemas";
import type { DB } from "../services/db";
import type { CommentSelectType } from "ponder:schema";
import { DataLoader, type DataLoaderOptions } from "../services/dataloader.ts";
import { isSameHex } from "@ecp.eth/shared/helpers";

export type CommentByIdResolver = DataLoader<
  {
    id: Hex;
    chainId: number;
  },
  CommentSelectType | null,
  string
>;

export type CommentByIdResolverOptions = {
  db: DB;
} & Omit<
  DataLoaderOptions<
    {
      id: Hex;
      chainId: number;
    },
    CommentSelectType | null,
    string
  >,
  "batchLoadFn" | "cacheKeyFn" | "name"
>;

export function createCommentByIdResolver({
  db,
  ...options
}: CommentByIdResolverOptions): CommentByIdResolver {
  return new DataLoader(
    async (keys) => {
      const comments = await db.query.comment.findMany({
        where(fields, operators) {
          return operators.sql`
            (${fields.id}, ${fields.chainId}) IN (
              ${operators.sql.join(
                keys.map(
                  (key) =>
                    operators.sql`(${key.id.toLowerCase()}, ${key.chainId})`,
                ),
                operators.sql`, `,
              )}
            )
          `;
        },
      });

      return keys.map((key) => {
        return (
          comments.find(
            (comment) =>
              isSameHex(comment.id, key.id) && comment.chainId === key.chainId,
          ) ?? null
        );
      });
    },
    {
      ...options,
      cacheKeyFn(key) {
        return JSON.stringify({
          id: key.id.toLowerCase(),
          chainId: key.chainId,
        });
      },
      name: "CommentByIdResolver",
    },
  );
}
