import type { Chain, Hex, Transport } from "viem";
import type {
  Comment,
  PendingPostCommentOperationSchemaType,
} from "./schemas.js";
import type {
  IndexerAPICommentSchemaType,
  IndexerAPICommentWithRepliesSchemaType,
} from "@ecp.eth/sdk/indexer/schemas";

export type OnDeleteComment = (id: Hex) => void;
export type OnRetryPostComment = (
  comment: Comment,
  newPendingOperation: PendingPostCommentOperationSchemaType
) => void;

export type OnSubmitSuccessFunction = () => void;

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
