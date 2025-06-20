import type {
  ContractFunctionParameters,
  ReadContractParameters,
  ReadContractReturnType,
} from "viem";
import type { CommentManagerABI } from "../abis.js";
import type { Hex } from "../core/schemas.js";

export type JsonLiteral = string | number | boolean | null;

export type JsonArray = Json[];

export type JsonObject = { [key: string]: Json };

export type Json = JsonLiteral | JsonArray | JsonObject;

export type CommentManagerABIType = typeof CommentManagerABI;

export enum AuthorAuthMethod {
  DIRECT_TX = 0,
  APP_APPROVAL = 1,
  AUTHOR_SIGNATURE = 2,
}

/**
 * Metadata entry structure that matches the smart contract
 */
export type MetadataEntry = {
  /** UTF-8 encoded string of format "type key" */
  key: Hex;
  /** The metadata value as bytes */
  value: Hex;
};

export enum MetadataOperation {
  SET = 0,
  DELETE = 1,
}

export type MetadataEntryOp = {
  operation: MetadataOperation;
  key: Hex;
  value: Hex;
};

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
   * 0 = standard comment, 1 = reaction
   *
   * If not provided, the default comment type (0) will be used
   *
   * @default 0
   */
  commentType?: number;
  /** Metadata about the comment as key-value pairs */
  metadata?: MetadataEntry[];
  /** The address of the author of the comment */
  author: Hex;
  /** The address of the app signer */
  app: Hex;
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
   * Empty string for replies
   */
  targetUri: string;
  /**
   * The type of the comment (0 = comment, 1 = reaction)
   */
  commentType: number;
  /**
   * The authentication method used to create this comment
   * 0 = DIRECT_TX, 1 = APP_APPROVAL, 2 = AUTHOR_SIGNATURE
   */
  authMethod: AuthorAuthMethod;
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
};

export type ContractWriteFunctions = {
  postCommentWithSig: (
    args: ContractFunctionParameters<
      CommentManagerABIType,
      "payable",
      "postCommentWithSig"
    > & {
      value?: bigint;
    },
  ) => Promise<Hex>;

  postComment: (
    args: ContractFunctionParameters<
      CommentManagerABIType,
      "payable",
      "postComment"
    > & {
      value?: bigint;
    },
  ) => Promise<Hex>;

  addApprovalWithSig: (
    args: ContractFunctionParameters<
      CommentManagerABIType,
      "nonpayable",
      "addApprovalWithSig"
    >,
  ) => Promise<Hex>;

  addApproval: (
    args: ContractFunctionParameters<
      CommentManagerABIType,
      "nonpayable",
      "addApproval"
    >,
  ) => Promise<Hex>;

  deleteCommentWithSig: (
    args: ContractFunctionParameters<
      CommentManagerABIType,
      "payable",
      "deleteCommentWithSig"
    >,
  ) => Promise<Hex>;

  deleteComment: (
    args: ContractFunctionParameters<
      CommentManagerABIType,
      "payable",
      "deleteComment"
    >,
  ) => Promise<Hex>;

  editCommentWithSig: (
    args: ContractFunctionParameters<
      CommentManagerABIType,
      "payable",
      "editCommentWithSig"
    > & {
      value?: bigint;
    },
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

  removeApprovalWithSig: (
    args: ContractFunctionParameters<
      CommentManagerABIType,
      "nonpayable",
      "removeApprovalWithSig"
    >,
  ) => Promise<Hex>;

  revokeApproval: (
    args: ContractFunctionParameters<
      CommentManagerABIType,
      "nonpayable",
      "revokeApproval"
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
