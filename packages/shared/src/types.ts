import type { Chain, Hex, Transport } from "viem";
import type { Comment, PendingCommentOperationSchemaType } from "./schemas.js";
import type {
  IndexerAPICommentSchemaType,
  IndexerAPICommentWithRepliesSchemaType,
} from "@ecp.eth/sdk/schemas";

export type OnDeleteComment = (id: Hex) => void;
export type OnRetryPostComment = (
  comment: Comment,
  newPendingOperation: PendingCommentOperationSchemaType
) => void;

export type OnSubmitSuccessFunction = (
  params: PendingCommentOperationSchemaType
) => void;

// used only within this module, do not export
type AllowedCommentTypes =
  | IndexerAPICommentSchemaType
  | IndexerAPICommentWithRepliesSchemaType;

export type AuthorType = AllowedCommentTypes["author"];

export type ProcessEnvNetwork = {
  chainId: number;
  chain: Chain;
  transport: Transport;
};
