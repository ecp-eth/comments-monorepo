import type { PendingCommentOperationSchemaType } from "@/lib/schemas";
import type { CommentType } from "@/lib/types";
import type { Hex } from "viem";

export type OnDeleteComment = (id: Hex) => void;
export type OnRetryPostComment = (
  comment: CommentType,
  newPendingOperation: PendingCommentOperationSchemaType
) => void;

export type OnSubmitCommentSuccessFunction = (
  params: PendingCommentOperationSchemaType
) => void;
