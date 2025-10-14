import type { SnakeCasedProperties } from "type-fest";
import type { CommentSelectType } from "ponder:schema";

export type JSONCommentSelectType = SnakeCasedProperties<{
  [K in keyof CommentSelectType]: CommentSelectType[K] extends Date
    ? string
    : CommentSelectType[K] extends Date | null
      ? string | null
      : CommentSelectType[K] extends bigint
        ? string | number
        : CommentSelectType[K];
}>;
