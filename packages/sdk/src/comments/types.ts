import type { ContractFunctionParameters, ReadContractReturnType } from "viem";
import type { Hex } from "../types.js";
import type { CommentsV1Abi } from "../abis.js";

export type CommentsV1AbiType = typeof CommentsV1Abi;

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
    args: ContractFunctionParameters<
      CommentsV1AbiType,
      "view",
      "getAddApprovalHash"
    >
  ) => Promise<ReadContractReturnType<CommentsV1AbiType, "getAddApprovalHash">>;

  getRemoveApprovalHash: (
    args: ContractFunctionParameters<
      CommentsV1AbiType,
      "view",
      "getRemoveApprovalHash"
    >
  ) => Promise<
    ReadContractReturnType<CommentsV1AbiType, "getRemoveApprovalHash">
  >;

  getDeleteCommentHash: (
    args: ContractFunctionParameters<
      CommentsV1AbiType,
      "view",
      "getDeleteCommentHash"
    >
  ) => Promise<
    ReadContractReturnType<CommentsV1AbiType, "getDeleteCommentHash">
  >;

  getCommentId: (
    args: ContractFunctionParameters<CommentsV1AbiType, "view", "getCommentId">
  ) => Promise<ReadContractReturnType<CommentsV1AbiType, "getCommentId">>;

  getComment: (
    args: ContractFunctionParameters<CommentsV1AbiType, "view", "getComment">
  ) => Promise<ReadContractReturnType<CommentsV1AbiType, "getComment">>;

  isApproved: (
    args: ContractFunctionParameters<CommentsV1AbiType, "view", "isApproved">
  ) => Promise<ReadContractReturnType<CommentsV1AbiType, "isApproved">>;

  name: (
    args: ContractFunctionParameters<CommentsV1AbiType, "view", "name">
  ) => Promise<ReadContractReturnType<CommentsV1AbiType, "name">>;

  version: (
    args: ContractFunctionParameters<CommentsV1AbiType, "view", "version">
  ) => Promise<ReadContractReturnType<CommentsV1AbiType, "version">>;

  DOMAIN_SEPARATOR: (
    args: ContractFunctionParameters<
      CommentsV1AbiType,
      "view",
      "DOMAIN_SEPARATOR"
    >
  ) => Promise<ReadContractReturnType<CommentsV1AbiType, "DOMAIN_SEPARATOR">>;

  channelManager: (
    args: ContractFunctionParameters<
      CommentsV1AbiType,
      "view",
      "channelManager"
    >
  ) => Promise<ReadContractReturnType<CommentsV1AbiType, "channelManager">>;
};
