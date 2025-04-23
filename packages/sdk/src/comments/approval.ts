import { z } from "zod";
import { COMMENTS_V1_ADDRESS } from "../constants.js";
import { HexSchema } from "../schemas/core.js";
import type { Hex } from "../types.js";
import { CommentsV1Abi } from "../abis.js";
import type { ReadContractParameters, ReadContractReturnType } from "viem";
import type {
  CommentsV1AbiType,
  ContractReadFunctions,
  ContractWriteFunctions,
} from "./types.js";
import { ADD_APPROVAL_TYPE, REMOVE_APPROVAL_TYPE } from "./eip712.js";
import {
  AddApprovalTypedDataSchema,
  RemoveApprovalTypedDataSchema,
  type RemoveApprovalTypedDataSchemaType,
  type AddApprovalTypedDataSchemaType,
} from "./schemas.js";
import { DOMAIN_NAME, DOMAIN_VERSION } from "./eip712.js";

export type IsApprovedParams = {
  /**
   * The author address
   */
  author: Hex;
  /**
   * The app signer address
   */
  appSigner: Hex;
  /**
   * The address of the comments contract
   * @default COMMENTS_V1_ADDRESS
   */
  commentsAddress?: Hex;
  readContract: ContractReadFunctions["isApproved"];
};

const IsApprovedParamsSchema = z.object({
  author: HexSchema,
  appSigner: HexSchema,
  commentsAddress: HexSchema.default(COMMENTS_V1_ADDRESS),
});

/**
 * Checks if an app signer is approved for an author
 *
 * @param params - The parameters for checking approval
 * @returns Whether the app signer is approved
 */
export async function isApproved(params: IsApprovedParams): Promise<boolean> {
  const { author, appSigner, commentsAddress } =
    IsApprovedParamsSchema.parse(params);

  const approved = await params.readContract({
    address: commentsAddress,
    abi: CommentsV1Abi,
    functionName: "isApproved",
    args: [author, appSigner],
  });

  return approved;
}

export type AddApprovalAsAuthorParams = {
  /**
   * The address of the app signer being approved
   */
  appSigner: Hex;
  /**
   * The address of the comments contract
   *
   * @default COMMENTS_V1_ADDRESS
   */
  commentsAddress?: Hex;
  writeContract: ContractWriteFunctions["addApprovalAsAuthor"];
};

export type AddApprovalAsAuthorResult = {
  txHash: Hex;
};

const AddApprovalAsAuthorParamsSchema = z.object({
  appSigner: HexSchema,
  commentsAddress: HexSchema.default(COMMENTS_V1_ADDRESS),
  writeContract: z.custom<ContractWriteFunctions["addApprovalAsAuthor"]>(
    () => true
  ),
});

/**
 * Approves an app signer directly as author
 *
 * @param params - The parameters for approving an app signer
 * @returns The transaction hash of the approval
 */
export async function addApprovalAsAuthor(
  params: AddApprovalAsAuthorParams
): Promise<AddApprovalAsAuthorResult> {
  const validatedParams = AddApprovalAsAuthorParamsSchema.parse(params);

  const { appSigner, commentsAddress, writeContract } = validatedParams;

  const txHash = await writeContract({
    address: commentsAddress,
    abi: CommentsV1Abi,
    functionName: "addApprovalAsAuthor",
    args: [appSigner],
  });

  return {
    txHash,
  };
}

export type AddApprovalParams = {
  /**
   * The typed data for the approval
   *
   * You can obtain this value by using createApprovalTypedData()
   */
  typedData: AddApprovalTypedDataSchemaType;
  /**
   * Author's signature for typed data
   */
  signature: Hex;
  /**
   * The address of the comments contract
   *
   * @default COMMENTS_V1_ADDRESS
   */
  commentsAddress?: Hex;
  writeContract: ContractWriteFunctions["addApproval"];
};

export type AddApprovalResult = {
  txHash: Hex;
};

const AddApprovalParamsSchema = z.object({
  typedData: AddApprovalTypedDataSchema,
  signature: HexSchema,
  commentsAddress: HexSchema.default(COMMENTS_V1_ADDRESS),
  writeContract: z.custom<ContractWriteFunctions["addApproval"]>(() => true),
});

/**
 * Adds an app signer approval with signature verification
 *
 * @param params - The parameters for adding an app signer approval
 * @returns The transaction hash of the approval
 */
export async function addApproval(
  params: AddApprovalParams
): Promise<AddApprovalResult> {
  const { typedData, signature, commentsAddress, writeContract } =
    AddApprovalParamsSchema.parse(params);

  const txHash = await writeContract({
    address: commentsAddress,
    abi: CommentsV1Abi,
    functionName: "addApproval",
    args: [
      typedData.message.author,
      typedData.message.appSigner,
      typedData.message.nonce,
      typedData.message.deadline,
      signature,
    ],
  });

  return {
    txHash,
  };
}

export type RevokeApprovalAsAuthorParams = {
  /**
   * The address of the app signer being unapproved
   */
  appSigner: Hex;
  /**
   * The address of the comments contract
   *
   * @default COMMENTS_V1_ADDRESS
   */
  commentsAddress?: Hex;
  writeContract: ContractWriteFunctions["revokeApprovalAsAuthor"];
};

export type RevokeApprovalAsAuthorResult = {
  txHash: Hex;
};

const RevokeApprovalAsAuthorParamsSchema = z.object({
  appSigner: HexSchema,
  commentsAddress: HexSchema.default(COMMENTS_V1_ADDRESS),
  writeContract: z.custom<ContractWriteFunctions["revokeApprovalAsAuthor"]>(
    () => true
  ),
});

/**
 * Revokes an app signer approval directly as author
 *
 * @param params - The parameters for revoking an app signer approval
 * @returns The transaction hash of the revocation
 */
export async function revokeApprovalAsAuthor(
  params: RevokeApprovalAsAuthorParams
): Promise<RevokeApprovalAsAuthorResult> {
  const validatedParams = RevokeApprovalAsAuthorParamsSchema.parse(params);

  const { appSigner, commentsAddress, writeContract } = validatedParams;

  const txHash = await writeContract({
    address: commentsAddress,
    abi: CommentsV1Abi,
    functionName: "revokeApprovalAsAuthor",
    args: [appSigner],
  });

  return {
    txHash,
  };
}

export type RevokeApprovalParams = {
  /**
   * The typed data for the removal
   *
   * You can obtain this value by using createRemoveApprovalTypedData()
   */
  typedData: RemoveApprovalTypedDataSchemaType;
  /**
   * The signature of the author
   */
  signature: Hex;
  /**
   * The address of the comments contract
   *
   * @default COMMENTS_V1_ADDRESS
   */
  commentsAddress?: Hex;
  writeContract: ContractWriteFunctions["removeApproval"];
};

export type RevokeApprovalResult = {
  txHash: Hex;
};

const RevokeApprovalParamsSchema = z.object({
  typedData: RemoveApprovalTypedDataSchema,
  signature: HexSchema,
  commentsAddress: HexSchema.default(COMMENTS_V1_ADDRESS),
  writeContract: z.custom<ContractWriteFunctions["removeApproval"]>(() => true),
});

/**
 * Removes an app signer approval with signature verification
 *
 * @param params - The parameters for removing an app signer approval
 * @returns The transaction hash of the removal
 */
export async function revokeApproval(
  params: RevokeApprovalParams
): Promise<RevokeApprovalResult> {
  const validatedParams = RevokeApprovalParamsSchema.parse(params);

  const { typedData, signature, commentsAddress, writeContract } =
    validatedParams;

  const txHash = await writeContract({
    address: commentsAddress,
    abi: CommentsV1Abi,
    functionName: "removeApproval",
    args: [
      typedData.message.author,
      typedData.message.appSigner,
      typedData.message.nonce,
      typedData.message.deadline,
      signature,
    ],
  });

  return {
    txHash,
  };
}

export type ReadAddApprovalHashFromContractFunction = (
  parameters: ReadContractParameters<CommentsV1AbiType, "getAddApprovalHash">
) => Promise<ReadContractReturnType<CommentsV1AbiType, "getAddApprovalHash">>;

export type GetAddApprovalHashParams = {
  /**
   * The address of the author
   */
  author: Hex;
  /**
   * The address of the app signer
   */
  appSigner: Hex;
  /**
   * The current nonce for the author
   */
  nonce: bigint;
  /**
   * Timestamp after which the signature becomes invalid
   *
   * @default 1 day from now
   */
  deadline?: bigint;
  /**
   * The address of the comments contract
   *
   * @default COMMENTS_V1_ADDRESS
   */
  commentsAddress?: Hex;
  readContract: ReadAddApprovalHashFromContractFunction;
};

export type GetAddApprovalHashData = {
  author: Hex;
  appSigner: Hex;
  nonce: bigint;
  deadline: bigint;
};

export type GetAddApprovalHashResult = {
  hash: Hex;
  data: GetAddApprovalHashData;
};

const GetAddApprovalHashParamsSchema = z.object({
  author: HexSchema,
  appSigner: HexSchema,
  nonce: z.bigint(),
  deadline: z.bigint().optional(),
  commentsAddress: HexSchema.default(COMMENTS_V1_ADDRESS),
});

/**
 * Gets the EIP-712 hash for adding approval
 *
 * @param params - The parameters for getting the add approval hash
 * @returns The computed hash
 */
export async function getAddApprovalHash(
  params: GetAddApprovalHashParams
): Promise<GetAddApprovalHashResult> {
  const { author, appSigner, nonce, deadline, commentsAddress } =
    GetAddApprovalHashParamsSchema.parse(params);

  let computedDeadline = deadline;

  if (!computedDeadline) {
    computedDeadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 60 * 24); // 1 day from now
  }

  const hash = await params.readContract({
    address: commentsAddress,
    abi: CommentsV1Abi,
    functionName: "getAddApprovalHash",
    args: [author, appSigner, nonce, computedDeadline],
  });

  return {
    hash,
    data: {
      author,
      appSigner,
      nonce,
      deadline: computedDeadline,
    },
  };
}

export type ReadRemoveApprovalHashFromContractFunction = (
  parameters: ReadContractParameters<CommentsV1AbiType, "getRemoveApprovalHash">
) => Promise<
  ReadContractReturnType<CommentsV1AbiType, "getRemoveApprovalHash">
>;

export type GetRemoveApprovalHashParams = {
  /**
   * The address of the author
   */
  author: Hex;
  /**
   * The address of the app signer
   */
  appSigner: Hex;
  /**
   * The current nonce for the author
   */
  nonce: bigint;
  /**
   * Timestamp after which the signature becomes invalid
   */
  deadline: bigint;
  /**
   * The address of the comments contract
   *
   * @default COMMENTS_V1_ADDRESS
   */
  commentsAddress?: Hex;
  readContract: ReadRemoveApprovalHashFromContractFunction;
};

export type GetRemoveApprovalHashResult = {
  hash: Hex;
};

const GetRemoveApprovalHashParamsSchema = z.object({
  author: HexSchema,
  appSigner: HexSchema,
  nonce: z.bigint(),
  deadline: z.bigint(),
  commentsAddress: HexSchema.default(COMMENTS_V1_ADDRESS),
});

/**
 * Gets the EIP-712 hash for removing approval
 *
 * @param params - The parameters for getting the remove approval hash
 * @returns The computed hash
 */
export async function getRemoveApprovalHash(
  params: GetRemoveApprovalHashParams
): Promise<GetRemoveApprovalHashResult> {
  const { author, appSigner, nonce, deadline, commentsAddress } =
    GetRemoveApprovalHashParamsSchema.parse(params);

  const hash = await params.readContract({
    address: commentsAddress,
    abi: CommentsV1Abi,
    functionName: "getRemoveApprovalHash",
    args: [author, appSigner, nonce, deadline],
  });

  return {
    hash,
  };
}

export type CreateApprovalTypedDataParams = {
  author: Hex;
  appSigner: Hex;
  /**
   * The chain ID
   */
  chainId: number;
  /**
   * The current nonce for the author and app signer
   */
  nonce: bigint;
  /**
   * Timestamp after which the signature becomes invalid
   */
  deadline?: bigint;
  /**
   * The address of the comments contract
   */
  commentsAddress?: Hex;
};

export type CreateApprovalTypedDataResult = AddApprovalTypedDataSchemaType;

const CreateApprovalTypedDataParamsSchema = z.object({
  author: HexSchema,
  appSigner: HexSchema,
  chainId: z.number(),
  nonce: z.bigint(),
  deadline: z.bigint().optional(),
  commentsAddress: HexSchema.default(COMMENTS_V1_ADDRESS),
});

/**
 * Create the EIP-712 typed data structure for approving comment
 * @returns The typed data
 */
export function createApprovalTypedData(
  params: CreateApprovalTypedDataParams
): CreateApprovalTypedDataResult {
  const validatedParams = CreateApprovalTypedDataParamsSchema.parse(params);

  const { author, appSigner, chainId, nonce, deadline, commentsAddress } =
    validatedParams;

  return AddApprovalTypedDataSchema.parse({
    domain: {
      name: DOMAIN_NAME,
      version: DOMAIN_VERSION,
      chainId,
      verifyingContract: commentsAddress,
    },
    types: ADD_APPROVAL_TYPE,
    primaryType: "AddApproval",
    message: {
      author,
      appSigner,
      nonce,
      deadline:
        deadline ?? BigInt(Math.floor(Date.now() / 1000) + 60 * 60 * 24), // 1 day from now
    },
  });
}

export type CreateRemoveApprovalTypedDataParams = {
  /**
   * The address of the author
   */
  author: Hex;
  /**
   * The address of the app signer
   */
  appSigner: Hex;
  /**
   * The chain ID
   */
  chainId: number;
  /**
   * The current nonce for the author and app signer
   */
  nonce: bigint;
  /**
   * Timestamp after which the signature becomes invalid
   */
  deadline?: bigint;
  /**
   * The address of the comments contract
   */
  commentsAddress?: Hex;
};

export type CreateRemoveApprovalTypedDataResult =
  RemoveApprovalTypedDataSchemaType;

const CreateRemoveApprovalTypedDataParamsSchema = z.object({
  author: HexSchema,
  appSigner: HexSchema,
  chainId: z.number(),
  nonce: z.bigint(),
  deadline: z.bigint().optional(),
  commentsAddress: HexSchema.default(COMMENTS_V1_ADDRESS),
});

/**
 * Create the EIP-712 typed data structure for removing approval
 * @returns The typed data
 */
export function createRemoveApprovalTypedData(
  params: CreateRemoveApprovalTypedDataParams
): CreateRemoveApprovalTypedDataResult {
  const validatedParams =
    CreateRemoveApprovalTypedDataParamsSchema.parse(params);

  const { author, appSigner, chainId, nonce, deadline, commentsAddress } =
    validatedParams;

  let computedDeadline = deadline;

  if (!computedDeadline) {
    computedDeadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 60 * 24); // 1 day from now
  }

  return RemoveApprovalTypedDataSchema.parse({
    domain: {
      name: DOMAIN_NAME,
      version: DOMAIN_VERSION,
      chainId,
      verifyingContract: commentsAddress,
    },
    types: REMOVE_APPROVAL_TYPE,
    primaryType: "RemoveApproval",
    message: {
      author,
      appSigner,
      nonce,
      deadline: computedDeadline,
    },
  });
}
