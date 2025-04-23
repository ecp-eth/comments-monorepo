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
  commentsContractAddress?: Hex;
  readContract: ContractReadFunctions["isApproved"];
};

const IsApprovedParamsSchema = z.object({
  author: HexSchema,
  appSigner: HexSchema,
  commentsContractAddress: HexSchema.default(COMMENTS_V1_ADDRESS),
});

/**
 * Checks if an app signer is approved for an author
 *
 * @param params - The parameters for checking approval
 * @returns Whether the app signer is approved
 */
export async function isApproved(params: IsApprovedParams): Promise<boolean> {
  const { author, appSigner, commentsContractAddress } =
    IsApprovedParamsSchema.parse(params);

  const approved = await params.readContract({
    address: commentsContractAddress,
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
  author: Hex;
  appSigner: Hex;
  nonce: bigint;
  deadline: bigint;
  signature: Hex;
  commentsAddress?: Hex;
  writeContract: ContractWriteFunctions["addApproval"];
};

export type AddApprovalResult = {
  txHash: Hex;
};

const AddApprovalParamsSchema = z.object({
  author: HexSchema,
  appSigner: HexSchema,
  nonce: z.bigint(),
  deadline: z.bigint(),
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
  const validatedParams = AddApprovalParamsSchema.parse(params);

  const {
    author,
    appSigner,
    commentsAddress,
    nonce,
    deadline,
    signature,
    writeContract,
  } = validatedParams;

  const txHash = await writeContract({
    address: commentsAddress,
    abi: CommentsV1Abi,
    functionName: "addApproval",
    args: [author, appSigner, nonce, deadline, signature],
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
  author: HexSchema,
  appSigner: HexSchema,
  nonce: z.bigint(),
  deadline: z.bigint(),
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

  const {
    author,
    appSigner,
    commentsAddress,
    nonce,
    deadline,
    signature,
    writeContract,
  } = validatedParams;

  const txHash = await writeContract({
    address: commentsAddress,
    abi: CommentsV1Abi,
    functionName: "removeApproval",
    args: [author, appSigner, nonce, deadline, signature],
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
   */
  deadline: bigint;
  /**
   * The address of the comments contract
   *
   * @default COMMENTS_V1_ADDRESS
   */
  commentsAddress?: Hex;
  readContract: ReadAddApprovalHashFromContractFunction;
};

export type GetAddApprovalHashResult = {
  hash: Hex;
};

const GetAddApprovalHashParamsSchema = z.object({
  author: HexSchema,
  appSigner: HexSchema,
  nonce: z.bigint(),
  deadline: z.bigint(),
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

  const hash = await params.readContract({
    address: commentsAddress,
    abi: CommentsV1Abi,
    functionName: "getAddApprovalHash",
    args: [author, appSigner, nonce, deadline],
  });

  return {
    hash,
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
