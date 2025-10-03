import DataLoader from "dataloader";
import type { Hex } from "@ecp.eth/sdk/core/schemas";
import type { DB } from "../services/db";
import type { CommentSelectType } from "ponder:schema";

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
  DataLoader.Options<
    {
      id: Hex;
      chainId: number;
    },
    CommentSelectType | null,
    string
  >,
  "batchLoadFn" | "cacheKeyFn"
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
          (${fields.id}, ${fields.chainId}) IN (${operators.sql`
            ${keys.map((key) => operators.sql`(${key.id}, ${key.chainId})`).join(", ")}
          `})
        `;
        },
      });

      return keys.map((key) => {
        return (
          comments.find(
            (comment) =>
              comment.id === key.id && comment.chainId === key.chainId,
          ) ?? null
        );
      });
    },
    {
      ...options,
      cacheKeyFn(key) {
        return JSON.stringify({
          id: key.id,
          chainId: key.chainId,
        });
      },
    },
  );
}
