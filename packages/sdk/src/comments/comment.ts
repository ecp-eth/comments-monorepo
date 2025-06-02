import { z } from "zod";
import {
  COMMENT_MANAGER_ADDRESS,
  DEFAULT_CHANNEL_ID,
  DEFAULT_COMMENT_TYPE,
  EMPTY_PARENT_ID,
} from "../constants.js";
import { HexSchema, type Hex } from "../core/schemas.js";
import { CommentManagerABI } from "../abis.js";
import { stringToHex } from "viem";
import type {
  ContractWriteFunctions,
  ContractReadFunctions,
  CreateCommentDataParams,
  CommentData,
  CommentManagerABIType,
} from "./types.js";
import {
  AddCommentTypedDataSchema,
  type AddCommentTypedDataSchemaType,
  type CommentInputData,
  CommentInputDataSchema,
  DeleteCommentTypedDataSchema,
  type DeleteCommentTypedDataSchemaType,
  type EditCommentData,
  EditCommentDataSchema,
  EditCommentTypedDataSchema,
  type EditCommentTypedDataSchemaType,
} from "./schemas.js";
import {
  ADD_COMMENT_TYPE,
  DELETE_COMMENT_TYPE,
  EDIT_COMMENT_TYPE,
  DOMAIN_NAME,
  DOMAIN_VERSION,
} from "./eip712.js";
import type {
  WaitableWriteContractHelperResult,
  WriteContractHelperResult,
} from "../core/types.js";
import { createWaitableWriteContractHelper } from "../core/utils.js";

export type PostCommentParams = {
  /**
   * The comment data
   *
   * You can obtain this by using the `createCommentData()` function
   */
  comment: CommentInputData;
  /**
   * The app signature
   */
  appSignature: Hex;
  /**
   * The fee for the comment
   */
  fee?: bigint;
  /**
   * The address of the comments contract
   * @default COMMENT_MANAGER_ADDRESS
   */
  commentsAddress?: Hex;
  /**
   * The write contract function
   */
  writeContract: ContractWriteFunctions["postComment"];
};

export type PostCommentResult = WaitableWriteContractHelperResult<
  CommentManagerABIType,
  "CommentAdded"
>;

const PostCommentParamsSchema = z.object({
  // we don't care here because comment is validated internally by createCommentData()
  comment: CommentInputDataSchema,
  appSignature: HexSchema,
  fee: z.bigint().optional(),
  commentsAddress: HexSchema.default(COMMENT_MANAGER_ADDRESS),
});

/**
 * Posts a comment as an author
 *
 * @param params - The parameters for posting a comment as an author
 * @returns The transaction hash
 */
export const postComment = createWaitableWriteContractHelper(
  async (params: PostCommentParams): Promise<WriteContractHelperResult> => {
    const validatedParams = PostCommentParamsSchema.parse(params);

    const { comment, commentsAddress, fee, appSignature } = validatedParams;

    const txHash = await params.writeContract({
      address: commentsAddress,
      abi: CommentManagerABI,
      functionName: "postComment",
      args: [comment, appSignature],
      value: fee,
    });

    return {
      txHash,
    };
  },
  {
    abi: CommentManagerABI,
    eventName: "CommentAdded",
  },
);

export type PostCommentWithSigParams = {
  /**
   * The comment data
   *
   * You can obtain this by using the `createCommentData()` function
   */
  comment: CommentInputData;
  /**
   * The app signature
   */
  appSignature: Hex;
  /**
   * The author signature. Necessary if the author hasn't approved the signer to post comments on their behalf.
   */
  authorSignature?: Hex;
  /**
   * The fee for the comment
   */
  fee?: bigint;
  /**
   * The address of the comments contract
   * @default COMMENT_MANAGER_ADDRESS
   */
  commentsAddress?: Hex;
  /**
   * The write contract function
   */
  writeContract: ContractWriteFunctions["postCommentWithSig"];
};

export type PostCommentWithSigResult = WaitableWriteContractHelperResult<
  CommentManagerABIType,
  "CommentAdded"
>;

const PostCommentWithSigParamsSchema = z.object({
  comment: CommentInputDataSchema,
  appSignature: HexSchema,
  authorSignature: HexSchema.optional(),
  commentsAddress: HexSchema.default(COMMENT_MANAGER_ADDRESS),
  fee: z.bigint().optional(),
});

/**
 * Posts a comment with author signature verification
 *
 * @param params - The parameters for posting a comment
 * @returns The transaction hash
 */
export const postCommentWithSig = createWaitableWriteContractHelper(
  async (
    params: PostCommentWithSigParams,
  ): Promise<WriteContractHelperResult> => {
    const validatedParams = PostCommentWithSigParamsSchema.parse(params);

    const { comment, appSignature, authorSignature, commentsAddress, fee } =
      validatedParams;

    const txHash = await params.writeContract({
      address: commentsAddress,
      abi: CommentManagerABI,
      functionName: "postCommentWithSig",
      args: [comment, authorSignature ?? stringToHex(""), appSignature],
      value: fee,
    });

    return {
      txHash,
    };
  },
  {
    abi: CommentManagerABI,
    eventName: "CommentAdded",
  },
);

export type GetCommentParams = {
  /**
   * The ID of the comment to get
   */
  commentId: Hex;
  /**
   * The address of the comments contract
   * @default COMMENT_MANAGER_ADDRESS
   */
  commentsAddress?: Hex;
  readContract: ContractReadFunctions["getComment"];
};

export type GetCommentResult = {
  comment: CommentData;
};

const GetCommentParamsSchema = z.object({
  commentId: HexSchema,
  commentsAddress: HexSchema.default(COMMENT_MANAGER_ADDRESS),
});

/**
 * Get a comment by ID
 *
 * @param params - The parameters for getting a comment
 * @returns The comment data
 */
export async function getComment(
  params: GetCommentParams,
): Promise<GetCommentResult> {
  const { commentId, commentsAddress } = GetCommentParamsSchema.parse(params);

  const comment = await params.readContract({
    address: commentsAddress,
    abi: CommentManagerABI,
    functionName: "getComment",
    args: [commentId],
  });

  return {
    comment,
  };
}

export type GetCommentIdParams = {
  /**
   * The comment data to get ID for
   */
  commentData: CreateCommentDataParams;
  /**
   * The address of the comments contract
   * @default COMMENT_MANAGER_ADDRESS
   */
  commentsAddress?: Hex;
  readContract: ContractReadFunctions["getCommentId"];
};

const GetCommentIdParamsSchema = z.object({
  commentData: z.custom<CreateCommentDataParams>(() => true),
  commentsAddress: HexSchema.default(COMMENT_MANAGER_ADDRESS),
});

/**
 * Get the ID for a comment before it is posted
 *
 * @param params - The parameters for getting a comment ID
 * @returns The comment ID
 */
export async function getCommentId(params: GetCommentIdParams): Promise<Hex> {
  const { commentData, commentsAddress } =
    GetCommentIdParamsSchema.parse(params);

  const commentId = await params.readContract({
    address: commentsAddress,
    abi: CommentManagerABI,
    functionName: "getCommentId",
    args: [createCommentData(commentData)],
  });

  return commentId;
}

export type DeleteCommentParams = {
  /**
   * The ID of the comment to delete
   */
  commentId: Hex;
  /**
   * The address of the comments contract
   * @default COMMENT_MANAGER_ADDRESS
   */
  commentsAddress?: Hex;
  writeContract: ContractWriteFunctions["deleteComment"];
};

export type DeleteCommentResult = WaitableWriteContractHelperResult<
  CommentManagerABIType,
  "CommentDeleted"
>;

const DeleteCommentParamsSchema = z.object({
  commentId: HexSchema,
  commentsAddress: HexSchema.default(COMMENT_MANAGER_ADDRESS),
});

/**
 * Delete a comment as an author
 *
 * @param params - The parameters for deleting a comment as an author
 * @returns The transaction hash
 */
export const deleteComment = createWaitableWriteContractHelper(
  async (params: DeleteCommentParams): Promise<WriteContractHelperResult> => {
    const { commentId, commentsAddress } =
      DeleteCommentParamsSchema.parse(params);

    const txHash = await params.writeContract({
      address: commentsAddress,
      abi: CommentManagerABI,
      functionName: "deleteComment",
      args: [commentId],
    });

    return {
      txHash,
    };
  },
  {
    abi: CommentManagerABI,
    eventName: "CommentDeleted",
  },
);

export type DeleteCommentWithSigParams = {
  /**
   * The ID of the comment to delete
   */
  commentId: Hex;
  /**
   * The app signer
   */
  app: Hex;
  /**
   * The deadline for the signature
   */
  deadline: bigint;
  /**
   * The address of the comments contract
   * @default COMMENT_MANAGER_ADDRESS
   */
  commentsAddress?: Hex;
  /**
   * The app signature
   */
  appSignature: Hex;
  /**
   * The author signature. Necessary if the author hasn't approved the signer to delete comments on their behalf.
   */
  authorSignature?: Hex;
  /**
   * The write contract function
   */
  writeContract: ContractWriteFunctions["deleteCommentWithSig"];
};

export type DeleteCommentWithSigResult = WaitableWriteContractHelperResult<
  CommentManagerABIType,
  "CommentDeleted"
>;

const DeleteCommentWithSigParamsSchema = z.object({
  commentId: HexSchema,
  app: HexSchema,
  deadline: z.bigint(),
  commentsAddress: HexSchema.default(COMMENT_MANAGER_ADDRESS),
  appSignature: HexSchema,
  authorSignature: HexSchema.optional(),
});

/**
 * Delete a comment with app signature verification
 *
 * @param params - The parameters for deleting a comment
 * @returns The transaction hash
 */
export const deleteCommentWithSig = createWaitableWriteContractHelper(
  async (
    params: DeleteCommentWithSigParams,
  ): Promise<WriteContractHelperResult> => {
    const validatedParams = DeleteCommentWithSigParamsSchema.parse(params);

    const {
      commentId,
      app,
      deadline,
      commentsAddress,
      appSignature,
      authorSignature,
    } = validatedParams;

    const txHash = await params.writeContract({
      address: commentsAddress,
      abi: CommentManagerABI,
      functionName: "deleteCommentWithSig",
      args: [
        commentId,
        app,
        deadline,
        authorSignature ?? stringToHex(""),
        appSignature,
      ],
    });

    return {
      txHash,
    };
  },
  {
    abi: CommentManagerABI,
    eventName: "CommentDeleted",
  },
);

export type GetDeleteCommentHashParams = {
  /**
   * The ID of the comment to delete
   */
  commentId: Hex;
  /**
   * The author of the comment
   */
  author: Hex;
  /**
   * The app signer
   */
  app: Hex;
  /**
   * The deadline for the signature
   *
   * @default 1 day from now
   */
  deadline: bigint;
  /**
   * The address of the comments contract
   * @default COMMENT_MANAGER_ADDRESS
   */
  commentsAddress?: Hex;
  readContract: ContractReadFunctions["getDeleteCommentHash"];
};

const GetDeleteCommentHashParamsSchema = z.object({
  commentId: HexSchema,
  author: HexSchema,
  app: HexSchema,
  deadline: z.bigint(),
  commentsAddress: HexSchema.default(COMMENT_MANAGER_ADDRESS),
});

/**
 * Get the hash for deleting a comment
 *
 * @param params - The parameters for getting a delete comment hash
 * @returns The delete comment hash
 */
export async function getDeleteCommentHash(
  params: GetDeleteCommentHashParams,
): Promise<Hex> {
  const { commentId, author, app, deadline, commentsAddress } =
    GetDeleteCommentHashParamsSchema.parse(params);

  const hash = await params.readContract({
    address: commentsAddress,
    abi: CommentManagerABI,
    functionName: "getDeleteCommentHash",
    args: [commentId, author, app, deadline],
  });

  return hash;
}

export type GetNonceParams = {
  /**
   * The author of the comment
   */
  author: Hex;
  /**
   * The app signer
   */
  app: Hex;
  /**
   * The address of the comments contract
   * @default COMMENT_MANAGER_ADDRESS
   */
  commentsAddress?: Hex;
  readContract: ContractReadFunctions["getNonce"];
};

const GetNonceParamsSchema = z.object({
  author: HexSchema,
  app: HexSchema,
  commentsAddress: HexSchema.default(COMMENT_MANAGER_ADDRESS),
});

/**
 * Get the nonce for the author and app signer
 *
 * @param params - The parameters for getting a nonce
 * @returns The nonce
 */
export async function getNonce(params: GetNonceParams): Promise<bigint> {
  const { author, app, commentsAddress } = GetNonceParamsSchema.parse(params);

  const nonce = await params.readContract({
    address: commentsAddress,
    abi: CommentManagerABI,
    functionName: "getNonce",
    args: [author, app],
  });

  return nonce;
}

export type CreateCommentTypedDataParams = {
  commentData: CommentInputData;
  chainId: number;
  /**
   * The address of the comments contract
   * @default COMMENT_MANAGER_ADDRESS
   */
  commentsAddress?: Hex;
};

const CreateCommentTypedDataParamsSchema = z.object({
  commentData: z.custom<CommentInputData>(() => true),
  chainId: z.number(),
  commentsAddress: HexSchema.default(COMMENT_MANAGER_ADDRESS),
});

/**
 * Create the EIP-712 typed data structure for adding comment
 * @returns The typed data
 */
export function createCommentTypedData(
  params: CreateCommentTypedDataParams,
): AddCommentTypedDataSchemaType {
  const validatedParams = CreateCommentTypedDataParamsSchema.parse(params);

  const { commentData, chainId, commentsAddress } = validatedParams;

  return AddCommentTypedDataSchema.parse({
    domain: {
      name: DOMAIN_NAME,
      version: DOMAIN_VERSION,
      chainId,
      verifyingContract: commentsAddress,
    },
    types: ADD_COMMENT_TYPE,
    primaryType: "AddComment",
    message: commentData,
  });
}

/**
 * Create the data structure of a comment
 * @return {@link comments!CommentInputData | CommentInputData} The data structure of a comment
 *
 */
export function createCommentData({
  content,
  metadata,
  author,
  app,
  deadline,
  channelId = DEFAULT_CHANNEL_ID,
  commentType = DEFAULT_COMMENT_TYPE,
  ...params
}: CreateCommentDataParams): CommentInputData {
  return CommentInputDataSchema.parse({
    content,
    metadata: metadata ? JSON.stringify(metadata) : "",
    targetUri: "parentId" in params ? "" : params.targetUri,
    parentId: "parentId" in params ? params.parentId : EMPTY_PARENT_ID,
    author,
    app,
    channelId,
    commentType,
    deadline: deadline ?? BigInt(Math.floor(Date.now() / 1000) + 60 * 60 * 24), // 1 day
  });
}

export type CreateDeleteCommentTypedDataParams = {
  commentId: Hex;
  chainId: number;
  /**
   * The author of the comment
   */
  author: Hex;
  /**
   * The app signer
   */
  app: Hex;
  /**
   * The deadline of the comment
   *
   * @default 1 day from now
   */
  deadline?: bigint;
  /**
   * The address of the comments contract
   * @default COMMENT_MANAGER_ADDRESS
   */
  commentsAddress?: Hex;
};

const CreateDeleteCommentTypedDataParamsSchema = z.object({
  commentId: HexSchema,
  chainId: z.number(),
  author: HexSchema,
  app: HexSchema,
  deadline: z.bigint().optional(),
  commentsAddress: HexSchema.default(COMMENT_MANAGER_ADDRESS),
});

/**
 * Create the EIP-712 typed data structure for deleting comment
 *
 * The comment won't be really deleted because of the nature of the blockchain.
 * The purpose of this is to mark comment as deleted so indexers can do their logic for deletions.
 *
 * @returns The typed data
 */
export function createDeleteCommentTypedData(
  params: CreateDeleteCommentTypedDataParams,
): DeleteCommentTypedDataSchemaType {
  const validatedParams =
    CreateDeleteCommentTypedDataParamsSchema.parse(params);

  const { commentId, chainId, author, app, deadline, commentsAddress } =
    validatedParams;

  return DeleteCommentTypedDataSchema.parse({
    domain: {
      name: DOMAIN_NAME,
      version: DOMAIN_VERSION,
      chainId,
      verifyingContract: commentsAddress,
    },
    types: DELETE_COMMENT_TYPE,
    primaryType: "DeleteComment",
    message: {
      commentId,
      author,
      app,
      deadline:
        deadline ?? BigInt(Math.floor(Date.now() / 1000) + 60 * 60 * 24), // 1 day from now
    },
  });
}

export type GetEditCommentHashParams = {
  /**
   * The author of the comment
   */
  author: Hex;
  /**
   * The edit data
   */
  edit: EditCommentData;
  /**
   * The address of the comments contract
   * @default COMMENT_MANAGER_ADDRESS
   */
  commentsAddress?: Hex;
  readContract: ContractReadFunctions["getEditCommentHash"];
};

const GetEditCommentHashParamsSchema = z.object({
  author: HexSchema,
  edit: EditCommentDataSchema,
  commentsAddress: HexSchema.default(COMMENT_MANAGER_ADDRESS),
});

/**
 * Get the hash for editing a comment
 * @returns The edit comment hash
 */
export async function getEditCommentHash(
  params: GetEditCommentHashParams,
): Promise<Hex> {
  const { author, edit, commentsAddress } =
    GetEditCommentHashParamsSchema.parse(params);

  const hash = await params.readContract({
    address: commentsAddress,
    abi: CommentManagerABI,
    functionName: "getEditCommentHash",
    args: [edit.commentId, author, edit],
  });

  return hash;
}

export type BaseEditCommentDataParams = {
  /**
   * The ID of the comment to edit
   */
  commentId: Hex;
  /**
   * The app
   */
  app: Hex;
  /**
   * The content of the comment (either updated or original)
   */
  content: string;
  /**
   * The nonce for the signature
   */
  nonce: bigint;
  /**
   * The deadline of the comment
   *
   * @default 1 day from now
   */
  deadline?: bigint;
};

export type EditCommentDataParamsWithMetadataRaw = BaseEditCommentDataParams & {
  /**
   * The metadata of the comment as a raw string (already json serialized)
   */
  metadataRaw: string;
};

export type EditCommentDataParamsWithMetadataObject =
  BaseEditCommentDataParams & {
    /**
     * The metadata of the comment as an object
     */
    metadataObject: object;
  };

export type EditCommentDataParams =
  | EditCommentDataParamsWithMetadataRaw
  | EditCommentDataParamsWithMetadataObject;

/**
 * Create the data structure of a comment for editing
 * @return {@link comments!EditCommentData | EditCommentData} The data structure of a comment for editing
 */
export function createEditCommentData(
  params: EditCommentDataParams,
): EditCommentData {
  return EditCommentDataSchema.parse({
    ...params,
    metadata:
      "metadataRaw" in params
        ? params.metadataRaw
        : JSON.stringify(params.metadataObject),
    deadline:
      params.deadline ?? BigInt(Math.floor(Date.now() / 1000) + 60 * 60 * 24), // 1 day from now
  });
}

export type CreateEditCommentTypedDataParams = {
  /**
   * The author of the comment
   */
  author: Hex;
  /**
   * The edit data
   *
   * You can obtain this by using the `createEditCommentData()` function
   */
  edit: EditCommentData;
  /**
   * The chain ID
   */
  chainId: number;
  /**
   * The address of the comments contract
   * @default COMMENT_MANAGER_ADDRESS
   */
  commentsAddress?: Hex;
};

const CreateEditCommentTypedDataParamsSchema = z.object({
  author: HexSchema,
  edit: EditCommentDataSchema,
  chainId: z.number(),
  commentsAddress: HexSchema.default(COMMENT_MANAGER_ADDRESS),
});

/**
 * Create the EIP-712 typed data structure for editing comment
 *
 * @returns The typed data
 */
export function createEditCommentTypedData(
  params: CreateEditCommentTypedDataParams,
): EditCommentTypedDataSchemaType {
  const validatedParams = CreateEditCommentTypedDataParamsSchema.parse(params);

  const { author, edit, chainId, commentsAddress } = validatedParams;

  return EditCommentTypedDataSchema.parse({
    domain: {
      name: DOMAIN_NAME,
      version: DOMAIN_VERSION,
      chainId,
      verifyingContract: commentsAddress,
    },
    types: EDIT_COMMENT_TYPE,
    primaryType: "EditComment",
    message: {
      ...edit,
      author,
    },
  });
}

export type EditCommentParams = {
  /**
   * The edit data
   *
   * You can obtain this by using the `createEditCommentData()` function
   */
  edit: EditCommentData;
  /**
   * The fee for the edit operation
   */
  fee?: bigint;
  /**
   * The address of the comments contract
   * @default COMMENT_MANAGER_ADDRESS
   */
  commentsAddress?: Hex;
  /**
   * The author signature.
   */
  appSignature: Hex;
  /**
   * The write contract function
   */
  writeContract: ContractWriteFunctions["editComment"];
};

const EditCommentParamsSchema = z.object({
  edit: EditCommentDataSchema,
  commentsAddress: HexSchema.default(COMMENT_MANAGER_ADDRESS),
  appSignature: HexSchema,
  fee: z.bigint().optional(),
});

export type EditCommentResult = WaitableWriteContractHelperResult<
  CommentManagerABIType,
  "CommentEdited"
>;

/**
 * Edit a comment as an author
 *
 * @param params - The parameters for editing a comment as an author
 * @returns The transaction hash
 */
export const editComment = createWaitableWriteContractHelper(
  async (params: EditCommentParams): Promise<WriteContractHelperResult> => {
    const validatedParams = EditCommentParamsSchema.parse(params);

    const { edit, commentsAddress, appSignature, fee } = validatedParams;

    const txHash = await params.writeContract({
      address: commentsAddress,
      abi: CommentManagerABI,
      functionName: "editComment",
      args: [edit.commentId, edit, appSignature],
      value: fee,
    });

    return {
      txHash,
    };
  },
  {
    abi: CommentManagerABI,
    eventName: "CommentEdited",
  },
);

export type EditCommentWithSigParams = {
  /**
   * The edit data
   *
   * You can obtain this by using the `createEditCommentData()` function
   */
  edit: EditCommentData;
  /**
   * The fee for the edit operation
   */
  fee?: bigint;
  /**
   * The address of the comments contract
   * @default COMMENT_MANAGER_ADDRESS
   */
  commentsAddress?: Hex;
  /**
   * The app signature
   */
  appSignature: Hex;
  /**
   * The author signature. Necessary if the author hasn't approved the signer to edit comments on their behalf.
   */
  authorSignature?: Hex;
  /**
   * The write contract function
   */
  writeContract: ContractWriteFunctions["editCommentWithSig"];
};

const EditCommentWithSigParamsSchema = z.object({
  edit: EditCommentDataSchema,
  commentsAddress: HexSchema.default(COMMENT_MANAGER_ADDRESS),
  appSignature: HexSchema,
  authorSignature: HexSchema.optional(),
  fee: z.bigint().optional(),
});

export type EditCommentWithSigResult = WaitableWriteContractHelperResult<
  CommentManagerABIType,
  "CommentEdited"
>;

/**
 * Edit a comment
 *
 * @param params - The parameters for editing a comment
 * @returns The transaction hash
 */
export const editCommentWithSig = createWaitableWriteContractHelper(
  async (
    params: EditCommentWithSigParams,
  ): Promise<WriteContractHelperResult> => {
    const validatedParams = EditCommentWithSigParamsSchema.parse(params);

    const { edit, commentsAddress, appSignature, authorSignature, fee } =
      validatedParams;

    const txHash = await params.writeContract({
      address: commentsAddress,
      abi: CommentManagerABI,
      functionName: "editCommentWithSig",
      args: [
        edit.commentId,
        edit,
        authorSignature ?? stringToHex(""),
        appSignature,
      ],
      value: fee,
    });

    return {
      txHash,
    };
  },
  {
    abi: CommentManagerABI,
    eventName: "CommentEdited",
  },
);
