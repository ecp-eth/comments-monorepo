import type { Chain, Hex, Transport } from "viem";
import type {
  Comment,
  PendingPostCommentOperationSchemaType,
} from "./schemas.js";
import type { IndexerAPICommentSchemaType } from "@ecp.eth/sdk/indexer/schemas";

export type OnDeleteComment = (id: Hex) => void;
export type OnRetryPostComment = (
  comment: Comment,
  newPendingOperation: PendingPostCommentOperationSchemaType,
) => void;

export type OnSubmitSuccessFunction = () => void;

// used only within this module, do not export
type AllowedCommentTypes = IndexerAPICommentSchemaType;

export type AuthorType = AllowedCommentTypes["author"];

export type ProcessEnvNetwork = {
  chainId: number;
  chain: Chain;
  transport: Transport;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DistributiveOmit<T, K extends keyof any> = T extends any
  ? Omit<T, K>
  : never;
