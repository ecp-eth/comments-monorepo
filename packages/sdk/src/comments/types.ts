import type {
  ContractFunctionParameters,
  ReadContractParameters,
  ReadContractReturnType,
} from "viem";
import type { CommentManagerABI } from "../abis.js";
import type { Hex } from "../core/schemas.js";

export type CommentManagerABIType = typeof CommentManagerABI;

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
  app: Hex;
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
 * The data structure of a comment returned by the contract
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
  app: Hex;
  /**
   * The timestamp of the comment creation in seconds since epoch
   */
  createdAt: bigint;
  /**
   * The timestamp of the comment update in seconds since epoch
   */
  updatedAt: bigint;
  /**
   * Additional data for the comment, added by a hook.
   */
  hookData: string;
};

export type ContractWriteFunctions = {
  postComment: (
    args: ContractFunctionParameters<
      CommentManagerABIType,
      "payable",
      "postComment"
    > & {
      value?: bigint;
    },
  ) => Promise<Hex>;

  postCommentAsAuthor: (
    args: ContractFunctionParameters<
      CommentManagerABIType,
      "payable",
      "postCommentAsAuthor"
    > & {
      value?: bigint;
    },
  ) => Promise<Hex>;

  addApproval: (
    args: ContractFunctionParameters<
      CommentManagerABIType,
      "nonpayable",
      "addApproval"
    >,
  ) => Promise<Hex>;

  addApprovalAsAuthor: (
    args: ContractFunctionParameters<
      CommentManagerABIType,
      "nonpayable",
      "addApprovalAsAuthor"
    >,
  ) => Promise<Hex>;

  deleteComment: (
    args: ContractFunctionParameters<
      CommentManagerABIType,
      "nonpayable",
      "deleteComment"
    >,
  ) => Promise<Hex>;

  deleteCommentAsAuthor: (
    args: ContractFunctionParameters<
      CommentManagerABIType,
      "nonpayable",
      "deleteCommentAsAuthor"
    >,
  ) => Promise<Hex>;

  editComment: (
    args: ContractFunctionParameters<
      CommentManagerABIType,
      "payable",
      "editComment"
    > & {
      value?: bigint;
    },
  ) => Promise<Hex>;

  editCommentAsAuthor: (
    args: ContractFunctionParameters<
      CommentManagerABIType,
      "payable",
      "editCommentAsAuthor"
    > & {
      value?: bigint;
    },
  ) => Promise<Hex>;

  removeApproval: (
    args: ContractFunctionParameters<
      CommentManagerABIType,
      "nonpayable",
      "removeApproval"
    >,
  ) => Promise<Hex>;

  renounceOwnership: (
    args: ContractFunctionParameters<
      CommentManagerABIType,
      "nonpayable",
      "renounceOwnership"
    >,
  ) => Promise<Hex>;

  revokeApprovalAsAuthor: (
    args: ContractFunctionParameters<
      CommentManagerABIType,
      "nonpayable",
      "revokeApprovalAsAuthor"
    >,
  ) => Promise<Hex>;

  transferOwnership: (
    args: ContractFunctionParameters<
      CommentManagerABIType,
      "nonpayable",
      "transferOwnership"
    >,
  ) => Promise<Hex>;

  updateChannelContract: (
    args: ContractFunctionParameters<
      CommentManagerABIType,
      "nonpayable",
      "updateChannelContract"
    >,
  ) => Promise<Hex>;
};

export type ContractReadFunctions = {
  getAddApprovalHash: (
    args: ReadContractParameters<CommentManagerABIType, "getAddApprovalHash">,
  ) => Promise<
    ReadContractReturnType<CommentManagerABIType, "getAddApprovalHash">
  >;

  getRemoveApprovalHash: (
    args: ReadContractParameters<
      CommentManagerABIType,
      "getRemoveApprovalHash"
    >,
  ) => Promise<
    ReadContractReturnType<CommentManagerABIType, "getRemoveApprovalHash">
  >;

  getDeleteCommentHash: (
    args: ReadContractParameters<CommentManagerABIType, "getDeleteCommentHash">,
  ) => Promise<
    ReadContractReturnType<CommentManagerABIType, "getDeleteCommentHash">
  >;

  getEditCommentHash: (
    args: ReadContractParameters<CommentManagerABIType, "getEditCommentHash">,
  ) => Promise<
    ReadContractReturnType<CommentManagerABIType, "getEditCommentHash">
  >;

  getCommentId: (
    args: ReadContractParameters<CommentManagerABIType, "getCommentId">,
  ) => Promise<ReadContractReturnType<CommentManagerABIType, "getCommentId">>;

  getComment: (
    args: ReadContractParameters<CommentManagerABIType, "getComment">,
  ) => Promise<ReadContractReturnType<CommentManagerABIType, "getComment">>;

  getIsApproved: (
    args: ReadContractParameters<CommentManagerABIType, "isApproved">,
  ) => Promise<ReadContractReturnType<CommentManagerABIType, "isApproved">>;

  getNonce: (
    args: ReadContractParameters<CommentManagerABIType, "getNonce">,
  ) => Promise<ReadContractReturnType<CommentManagerABIType, "getNonce">>;

  name: (
    args: ReadContractParameters<CommentManagerABIType, "name">,
  ) => Promise<ReadContractReturnType<CommentManagerABIType, "name">>;

  version: (
    args: ReadContractParameters<CommentManagerABIType, "version">,
  ) => Promise<ReadContractReturnType<CommentManagerABIType, "version">>;

  DOMAIN_SEPARATOR: (
    args: ReadContractParameters<CommentManagerABIType, "DOMAIN_SEPARATOR">,
  ) => Promise<
    ReadContractReturnType<CommentManagerABIType, "DOMAIN_SEPARATOR">
  >;

  channelManager: (
    args: ReadContractParameters<CommentManagerABIType, "channelManager">,
  ) => Promise<ReadContractReturnType<CommentManagerABIType, "channelManager">>;
};
