import { Effect } from "effect";
import type { WalletClient } from "viem";
import type { Hex } from "./types.js";
import { CommentsV1Abi } from "./abis.js";
import { COMMENTS_V1_CONTRACT_ADDRESS } from "./constants.js";
import {
  AppSignedCommentSchema,
  type AppSignedCommentSchemaType,
  type AppApprovedStatusResponseSchemaType,
  AppApprovedStatusResponseSchema,
} from "./schemas.js";

export { COMMENTS_V1_CONTRACT_ADDRESS };

type PostCommentAsAuthor = {
  /**
   * Comment signed by app signer.
   */
  signedComment: AppSignedCommentSchemaType;
  wallet: WalletClient;
};

/**
 * Posts a signed comment as an author.
 *
 * This operations uses user's funds to pay for gas fees.
 */
export async function postCommentAsAuthor({
  signedComment,
  wallet,
}: PostCommentAsAuthor): Promise<Hex> {
  const writeCommentTask = Effect.tryPromise(async () => {
    const signedData = AppSignedCommentSchema.parse(signedComment);

    const result = await wallet.writeContract({
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

type RejectAppApprovalOptions = {
  approval: AppApprovedStatusResponseSchemaType;
  wallet: WalletClient;
};

export async function rejectAppApproval({
  approval,
  wallet,
}: RejectAppApprovalOptions): Promise<Hex> {
  const rejectAppApprovalTask = Effect.tryPromise(async () => {
    const data = AppApprovedStatusResponseSchema.parse(approval);

    const txHash = await wallet.writeContract({
      account: null, // use current account
      chain: null, // use current chain
      abi: CommentsV1Abi,
      address: COMMENTS_V1_CONTRACT_ADDRESS,
      functionName: "removeApprovalAsAuthor",
      args: [data.appSigner],
    });

    return txHash;
  });

  return Effect.runPromise(rejectAppApprovalTask);
}

type DeleteCommentOptions = {
  commentId: Hex;
  wallet: WalletClient;
};

export async function deleteCommentAsAuthor({
  commentId,
  wallet,
}: DeleteCommentOptions): Promise<Hex> {
  const deleteCommentTask = Effect.tryPromise(async () => {
    const txHash = await wallet.writeContract({
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
