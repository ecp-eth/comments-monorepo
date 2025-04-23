import type {
  ContractFunctionParameters,
  ReadContractParameters,
  ReadContractReturnType,
} from "viem";
import type { Hex } from "../types.js";
import type { CommentsV1Abi } from "../abis.js";

export type CommentsV1AbiType = typeof CommentsV1Abi;

/**
 * The data structure of a comment to be signed and then passed to the Embed API
 */
export type CommentData = {
  /**
   * The content of the comment
   */
  content: string;
  /**
   * Metadata about the comment
   */
  metadata: string;
  /**
   * Empty string for replies
   */
  targetUri: string;
  /**
   * The type of the comment
   */
  commentType: string;
  /**
   * The ID of the channel
   */
  channelId: bigint;
  /**
   * id of parent comments if it has one, 0x for no parent comment
   *
   * @remarks This zero address (32 bytes of zeros) indicates the comment has no parent and is a top-level comment
   */
  parentId: Hex;
  /**
   * The address of the author of the comment
   */
  author: Hex;
  /**
   * The address of the app signer
   */
  appSigner: Hex;
  /**
   * The nonce for the user per app
   */
  nonce: bigint;
  /**
   * The deadline of the comment submission in seconds since epoch
   */
  deadline: bigint;
};

export type ContractWriteFunctions = {
  postComment: (
    args: ContractFunctionParameters<
      CommentsV1AbiType,
      "payable",
      "postComment"
    > & {
      value?: bigint;
    }
  ) => Promise<Hex>;

  postCommentAsAuthor: (
    args: ContractFunctionParameters<
      CommentsV1AbiType,
      "payable",
      "postCommentAsAuthor"
    > & {
      value?: bigint;
    }
  ) => Promise<Hex>;

  addApproval: (
    args: ContractFunctionParameters<
      CommentsV1AbiType,
      "nonpayable",
      "addApproval"
    >
  ) => Promise<Hex>;

  addApprovalAsAuthor: (
    args: ContractFunctionParameters<
      CommentsV1AbiType,
      "nonpayable",
      "addApprovalAsAuthor"
    >
  ) => Promise<Hex>;

  deleteComment: (
    args: ContractFunctionParameters<
      CommentsV1AbiType,
      "nonpayable",
      "deleteComment"
    >
  ) => Promise<Hex>;

  deleteCommentAsAuthor: (
    args: ContractFunctionParameters<
      CommentsV1AbiType,
      "nonpayable",
      "deleteCommentAsAuthor"
    >
  ) => Promise<Hex>;

  removeApproval: (
    args: ContractFunctionParameters<
      CommentsV1AbiType,
      "nonpayable",
      "removeApproval"
    >
  ) => Promise<Hex>;

  renounceOwnership: (
    args: ContractFunctionParameters<
      CommentsV1AbiType,
      "nonpayable",
      "renounceOwnership"
    >
  ) => Promise<Hex>;

  revokeApprovalAsAuthor: (
    args: ContractFunctionParameters<
      CommentsV1AbiType,
      "nonpayable",
      "revokeApprovalAsAuthor"
    >
  ) => Promise<Hex>;

  transferOwnership: (
    args: ContractFunctionParameters<
      CommentsV1AbiType,
      "nonpayable",
      "transferOwnership"
    >
  ) => Promise<Hex>;

  updateChannelContract: (
    args: ContractFunctionParameters<
      CommentsV1AbiType,
      "nonpayable",
      "updateChannelContract"
    >
  ) => Promise<Hex>;
};

export type ContractReadFunctions = {
  getAddApprovalHash: (
    args: ReadContractParameters<CommentsV1AbiType, "getAddApprovalHash">
  ) => Promise<ReadContractReturnType<CommentsV1AbiType, "getAddApprovalHash">>;

  getRemoveApprovalHash: (
    args: ReadContractParameters<CommentsV1AbiType, "getRemoveApprovalHash">
  ) => Promise<
    ReadContractReturnType<CommentsV1AbiType, "getRemoveApprovalHash">
  >;

  getDeleteCommentHash: (
    args: ReadContractParameters<CommentsV1AbiType, "getDeleteCommentHash">
  ) => Promise<
    ReadContractReturnType<CommentsV1AbiType, "getDeleteCommentHash">
  >;

  getCommentId: (
    args: ReadContractParameters<CommentsV1AbiType, "getCommentId">
  ) => Promise<ReadContractReturnType<CommentsV1AbiType, "getCommentId">>;

  getComment: (
    args: ReadContractParameters<CommentsV1AbiType, "getComment">
  ) => Promise<ReadContractReturnType<CommentsV1AbiType, "getComment">>;

  isApproved: (
    args: ReadContractParameters<CommentsV1AbiType, "isApproved">
  ) => Promise<ReadContractReturnType<CommentsV1AbiType, "isApproved">>;

  name: (
    args: ReadContractParameters<CommentsV1AbiType, "name">
  ) => Promise<ReadContractReturnType<CommentsV1AbiType, "name">>;

  version: (
    args: ReadContractParameters<CommentsV1AbiType, "version">
  ) => Promise<ReadContractReturnType<CommentsV1AbiType, "version">>;

  DOMAIN_SEPARATOR: (
    args: ReadContractParameters<CommentsV1AbiType, "DOMAIN_SEPARATOR">
  ) => Promise<ReadContractReturnType<CommentsV1AbiType, "DOMAIN_SEPARATOR">>;

  channelManager: (
    args: ReadContractParameters<CommentsV1AbiType, "channelManager">
  ) => Promise<ReadContractReturnType<CommentsV1AbiType, "channelManager">>;
};
