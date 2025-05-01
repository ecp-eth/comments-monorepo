import type {
  ContractFunctionParameters,
  ReadContractParameters,
  ReadContractReturnType,
} from "viem";
import type { CommentManagerAbi } from "../abis.js";
import type { Hex } from "../core/schemas.js";

export type CommentManagerAbiType = typeof CommentManagerAbi;

/**
 * The shared parameters for creating a comment
 */
export type CreateCommentDataParamsShared = {
  /** The content of the comment */
  content: string;
  /**
   * The ID of the channel the comment is being made in
   *
   * If not provided, the default channel ID (0) will be used
   *
   * @default 0n
   */
  channelId?: bigint;
  /**
   * The type of the comment
   *
   * If not provided, the default comment type (comment) will be used
   *
   * @default "comment"
   */
  commentType?: string;
  /** Metadata about the comment */
  metadata?: object;
  /** The address of the author of the comment */
  author: Hex;
  /** The address of the app signer */
  appSigner: Hex;
  /** The current nonce for the user per app on the chain */
  nonce: bigint;
  /** The deadline of the comment submission in seconds since epoch */
  deadline?: bigint;
};

/**
 * The parameters for creating a root comment
 */
export type CreateRootCommentDataParams = CreateCommentDataParamsShared & {
  /** The URI of the page the comment is about */
  targetUri: string;
};

/**
 * The parameters for creating a reply comment
 */
export type CreateReplyCommentDataParams = CreateCommentDataParamsShared & {
  /** The ID of the parent comment */
  parentId: Hex;
};

export type CreateCommentDataParams =
  | CreateRootCommentDataParams
  | CreateReplyCommentDataParams;

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
      CommentManagerAbiType,
      "payable",
      "postComment"
    > & {
      value?: bigint;
    }
  ) => Promise<Hex>;

  postCommentAsAuthor: (
    args: ContractFunctionParameters<
      CommentManagerAbiType,
      "payable",
      "postCommentAsAuthor"
    > & {
      value?: bigint;
    }
  ) => Promise<Hex>;

  addApproval: (
    args: ContractFunctionParameters<
      CommentManagerAbiType,
      "nonpayable",
      "addApproval"
    >
  ) => Promise<Hex>;

  addApprovalAsAuthor: (
    args: ContractFunctionParameters<
      CommentManagerAbiType,
      "nonpayable",
      "addApprovalAsAuthor"
    >
  ) => Promise<Hex>;

  deleteComment: (
    args: ContractFunctionParameters<
      CommentManagerAbiType,
      "nonpayable",
      "deleteComment"
    >
  ) => Promise<Hex>;

  deleteCommentAsAuthor: (
    args: ContractFunctionParameters<
      CommentManagerAbiType,
      "nonpayable",
      "deleteCommentAsAuthor"
    >
  ) => Promise<Hex>;

  removeApproval: (
    args: ContractFunctionParameters<
      CommentManagerAbiType,
      "nonpayable",
      "removeApproval"
    >
  ) => Promise<Hex>;

  renounceOwnership: (
    args: ContractFunctionParameters<
      CommentManagerAbiType,
      "nonpayable",
      "renounceOwnership"
    >
  ) => Promise<Hex>;

  revokeApprovalAsAuthor: (
    args: ContractFunctionParameters<
      CommentManagerAbiType,
      "nonpayable",
      "revokeApprovalAsAuthor"
    >
  ) => Promise<Hex>;

  transferOwnership: (
    args: ContractFunctionParameters<
      CommentManagerAbiType,
      "nonpayable",
      "transferOwnership"
    >
  ) => Promise<Hex>;

  updateChannelContract: (
    args: ContractFunctionParameters<
      CommentManagerAbiType,
      "nonpayable",
      "updateChannelContract"
    >
  ) => Promise<Hex>;
};

export type ContractReadFunctions = {
  getAddApprovalHash: (
    args: ReadContractParameters<CommentManagerAbiType, "getAddApprovalHash">
  ) => Promise<
    ReadContractReturnType<CommentManagerAbiType, "getAddApprovalHash">
  >;

  getRemoveApprovalHash: (
    args: ReadContractParameters<CommentManagerAbiType, "getRemoveApprovalHash">
  ) => Promise<
    ReadContractReturnType<CommentManagerAbiType, "getRemoveApprovalHash">
  >;

  getDeleteCommentHash: (
    args: ReadContractParameters<CommentManagerAbiType, "getDeleteCommentHash">
  ) => Promise<
    ReadContractReturnType<CommentManagerAbiType, "getDeleteCommentHash">
  >;

  getCommentId: (
    args: ReadContractParameters<CommentManagerAbiType, "getCommentId">
  ) => Promise<ReadContractReturnType<CommentManagerAbiType, "getCommentId">>;

  getComment: (
    args: ReadContractParameters<CommentManagerAbiType, "getComment">
  ) => Promise<ReadContractReturnType<CommentManagerAbiType, "getComment">>;

  isApproved: (
    args: ReadContractParameters<CommentManagerAbiType, "isApproved">
  ) => Promise<ReadContractReturnType<CommentManagerAbiType, "isApproved">>;

  name: (
    args: ReadContractParameters<CommentManagerAbiType, "name">
  ) => Promise<ReadContractReturnType<CommentManagerAbiType, "name">>;

  version: (
    args: ReadContractParameters<CommentManagerAbiType, "version">
  ) => Promise<ReadContractReturnType<CommentManagerAbiType, "version">>;

  DOMAIN_SEPARATOR: (
    args: ReadContractParameters<CommentManagerAbiType, "DOMAIN_SEPARATOR">
  ) => Promise<
    ReadContractReturnType<CommentManagerAbiType, "DOMAIN_SEPARATOR">
  >;

  channelManager: (
    args: ReadContractParameters<CommentManagerAbiType, "channelManager">
  ) => Promise<ReadContractReturnType<CommentManagerAbiType, "channelManager">>;
};
