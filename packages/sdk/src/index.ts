import { Effect } from "effect";
import type { WriteContractParameters } from "viem";
import type { Hex } from "./types.js";
import { CommentsV1Abi } from "./abis.js";
import { COMMENTS_V1_CONTRACT_ADDRESS } from "./constants.js";
import {
  AppSignedCommentSchema,
  type AppSignedCommentSchemaType,
  HexSchema,
} from "./schemas.js";

export { COMMENTS_V1_CONTRACT_ADDRESS };

type PostCommentAsAuthor = {
  /**
   * Comment signed by app signer.
   */
  signedComment: AppSignedCommentSchemaType;
  writeContract: (parameters: WriteContractParameters) => Promise<Hex>;
};

/**
 * Posts a signed comment as an author.
 *
 * This operations uses user's funds to pay for gas fees.
 */
export async function postCommentAsAuthor({
  signedComment,
  writeContract,
}: PostCommentAsAuthor): Promise<Hex> {
  const writeCommentTask = Effect.tryPromise(async () => {
    const signedData = AppSignedCommentSchema.parse(signedComment);

    const result = await writeContract({
      account: null, // use current account
      chain: null, // use current chain
      abi: CommentsV1Abi,
      address: COMMENTS_V1_CONTRACT_ADDRESS,
      functionName: "postCommentAsAuthor",
      args: [signedData.data, signedData.signature],
    });

    return result;
  });

  return Effect.runPromise(writeCommentTask);
}

type RemoveAppApprovalOptions = {
  appSigner: Hex;
  writeContract: (parameters: WriteContractParameters) => Promise<Hex>;
};

export async function removeAppApproval({
  appSigner,
  writeContract,
}: RemoveAppApprovalOptions): Promise<Hex> {
  const rejectAppApprovalTask = Effect.tryPromise(async () => {
    const txHash = await writeContract({
      account: null, // use current account
      chain: null, // use current chain
      abi: CommentsV1Abi,
      address: COMMENTS_V1_CONTRACT_ADDRESS,
      functionName: "removeApprovalAsAuthor",
      args: [HexSchema.parse(appSigner)],
    });

    return txHash;
  });

  return Effect.runPromise(rejectAppApprovalTask);
}

type DeleteCommentOptions = {
  commentId: Hex;
  writeContract: (parameters: WriteContractParameters) => Promise<Hex>;
};

export async function deleteCommentAsAuthor({
  commentId,
  writeContract,
}: DeleteCommentOptions): Promise<Hex> {
  const deleteCommentTask = Effect.tryPromise(async () => {
    const txHash = await writeContract({
      account: null, // use current account
      chain: null, // use current chain
      abi: CommentsV1Abi,
      address: COMMENTS_V1_CONTRACT_ADDRESS,
      functionName: "deleteCommentAsAuthor",
      args: [commentId],
    });

    return txHash;
  });

  return Effect.runPromise(deleteCommentTask);
}
