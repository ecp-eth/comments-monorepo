import type { DB } from "../db";
import { type Hex } from "@ecp.eth/sdk/core";
import {
  and,
  eq,
  inArray,
  isNotNull,
  isNull,
  lte,
  type SQL,
  sql,
} from "drizzle-orm";
import * as schema from "../../../ponder.schema";
import { convertExcludeModerationLabelsToConditions } from "../../api/comments/helpers";
import {
  type LowercasedHex,
  type CommentModerationLabel,
  type ModerationStatus,
} from "../types";
import { DataLoader, type DataLoaderOptions } from "../dataloader";

export type ReplyCountsByParentIdResolverKey = {
  parentId: Hex;
  mode: "flat" | "nested";
  isDeleted?: boolean;
  app?: Hex;
  commentType?: number;
  excludeModerationLabels?: CommentModerationLabel[];
  moderationScore?: number;
  moderationStatus?: ModerationStatus[];
};

export type ReplyCountsByParentIdResolver = DataLoader<
  ReplyCountsByParentIdResolverKey,
  number,
  string
>;

export type ReplyCountsByParentIdResolverOptions = {
  db: DB;
} & Omit<
  DataLoaderOptions<ReplyCountsByParentIdResolverKey, number, string>,
  "batchLoadFn" | "cacheKeyFn" | "name"
>;

function keyToString(key: ReplyCountsByParentIdResolverKey): string {
  return `${key.parentId.toLowerCase()}-${key.mode}-${key.isDeleted ? "true" : "false"}-${key.app?.toLowerCase() ?? ""}-${key.commentType ?? ""}-${key.excludeModerationLabels?.join(",") ?? ""}-${key.moderationScore ?? ""}-${key.moderationStatus?.join(",") ?? ""}`;
}

export function createReplyCountsByParentIdResolver({
  db,
  ...options
}: ReplyCountsByParentIdResolverOptions): ReplyCountsByParentIdResolver {
  return new DataLoader(
    async (keys) => {
      const queries: SQL[] = [];

      for (const conditions of keys) {
        queries.push(sql`
          SELECT 
            ${keyToString(conditions)} as "key", 
            COUNT(*)::int as "count"
          FROM ${schema.comment}
          WHERE ${and(
            conditions.mode === "flat"
              ? eq(
                  schema.comment.rootCommentId,
                  conditions.parentId.toLowerCase() as LowercasedHex,
                )
              : eq(
                  schema.comment.parentId,
                  conditions.parentId.toLowerCase() as LowercasedHex,
                ),
            conditions.app ? eq(schema.comment.app, conditions.app) : undefined,
            conditions.commentType != null
              ? eq(schema.comment.commentType, conditions.commentType)
              : undefined,
            conditions.excludeModerationLabels
              ? convertExcludeModerationLabelsToConditions(
                  conditions.excludeModerationLabels,
                )
              : undefined,
            conditions.moderationScore != null
              ? lte(
                  schema.comment.moderationClassifierScore,
                  conditions.moderationScore,
                )
              : undefined,
            typeof conditions.isDeleted === "boolean"
              ? conditions.isDeleted
                ? isNotNull(schema.comment.deletedAt)
                : isNull(schema.comment.deletedAt)
              : undefined,
            conditions.moderationStatus != null &&
              conditions.moderationStatus.length > 0
              ? inArray(
                  schema.comment.moderationStatus,
                  conditions.moderationStatus,
                )
              : undefined,
          )}
        `);
      }

      const { rows } = await db.execute<{
        key: string;
        count: number;
      }>(sql.join(queries, sql` UNION ALL `));

      return keys.map((key) => {
        const stringKey = keyToString(key);

        for (const result of rows) {
          if (result.key === stringKey) {
            return result.count;
          }
        }

        return 0;
      });
    },
    {
      ...options,
      cacheKeyFn: keyToString,
      name: "ReplyCountsByParentIdResolver",
    },
  );
}
