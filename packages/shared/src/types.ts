import type { Hex } from "viem";
import type { Comment, PendingCommentOperationSchemaType } from "./schemas.js";

export type OnDeleteComment = (id: Hex) => void;
export type OnRetryPostComment = (
  comment: Comment,
  newPendingOperation: PendingCommentOperationSchemaType
) => void;

export type OnSubmitSuccessFunction = (
  params: PendingCommentOperationSchemaType
) => void;
