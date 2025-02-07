import { useWalletClient } from "wagmi";
import {
  postCommentAsAuthor,
  deleteCommentAsAuthor,
  rejectAppApproval,
} from "./index.js";
import type { Hex } from "./types.js";
import { useMutation, type UseMutationResult } from "@tanstack/react-query";
import {
  type AppSignedCommentSchemaType,
  type SignCommentByAppRequestSchemaType,
  AppSignedCommentSchema,
  type CommentInputSchemaType,
  SignCommentByAppRequestSchema,
  CommentInputSchema,
  type GaslessCommentSignatureResponseSchemaType,
  GaslessCommentSignatureResponseSchema,
  type SignGaslessCommentRequiresSigningResponseSchemaType,
  HexSchema,
  type AppNotApprovedStatusResponseSchemaType,
  AppNotApprovedStatusResponseSchema,
  type AppApprovedStatusResponseSchemaType,
  AppApprovedStatusResponseSchema,
} from "./schemas.js";

type UsePostCommentAsAuthorReturnValue = UseMutationResult<
  Hex,
  Error,
  { comment: SignCommentByAppRequestSchemaType }
>;

type UsePostCommentAsAuthorOptions = {
  /**
   * Function which should get the signature of a comment from the app's backend.
   *
   * This signature is then used to post the comment on-chain using the user's wallet.
   */
  fetchCommentSignature: (
    comment: SignCommentByAppRequestSchemaType
  ) => Promise<AppSignedCommentSchemaType>;
};

/**
 * Posts a comment as an author. This operations costs author's funds.
 *
 * @example
 * ```
 * import { usePostCommentAsAuthor } from '@modprotocol/comments-protocol-sdk/wagmi';
 *
 * function Component() {
 *   const { mutate } = usePostCommentAsAuthor({
 *     fetchCommentSignature: async (comment) => {
 *       const response = await fetch('/api/sign-comment', {
 *         method: 'POST',
 *         body: JSON.stringify(comment),
 *         headers: {
 *           'Content-Type': 'application/json',
 *         },
 *       });
 *
 *       return response.json();
 *     },
 *   });
 *
 *   return <Button onClick={() => {
 *     mutate({
 *       comment: {
 *         content: 'Hello, world!',
 *         targetUri: 'https://test.tld',
 *         author: '0x00000000....'
 *       },
 *     });
 *   }}>Post comment</Button>;
 * }
 * ```
 *
 * @example
 * ```
 * import { usePostCommentAsAuthor } from '@modprotocol/comments-protocol-sdk/wagmi';
 *
 * function Component() {
 *   const { mutate } = usePostCommentAsAuthor({
 *     fetchCommentSignature: async (comment) => {
 *       const response = await fetch('/api/sign-comment', {
 *         method: 'POST',
 *         body: JSON.stringify(comment),
 *         headers: {
 *           'Content-Type': 'application/json',
 *         },
 *       });
 *
 *       return response.json();
 *     },
 *   });
 *
 *   return <Button onClick={() => {
 *     mutate({
 *       comment: {
 *         content: 'Hello, world!',
 *         targetUri: 'https://test.tld',
 *         parentId: '0x000000....',
 *         author: '0x00000000....'
 *       }
 *     });
 *   }}>Post comment</Button>;
 * }
 * ```
 */
export function usePostCommentAsAuthor({
  fetchCommentSignature,
}: UsePostCommentAsAuthorOptions): UsePostCommentAsAuthorReturnValue {
  const { data: walletClient } = useWalletClient();

  return useMutation({
    async mutationFn({ comment }) {
      if (!walletClient) {
        throw new Error("Wallet client is not available.");
      }

      const request = SignCommentByAppRequestSchema.parse(comment);

      const appSignedCommentResponse = AppSignedCommentSchema.parse(
        await fetchCommentSignature(request)
      );

      if (appSignedCommentResponse.chainId !== walletClient.chain.id) {
        await walletClient.switchChain({
          id: appSignedCommentResponse.chainId,
        });
      }

      const response = await postCommentAsAuthor({
        wallet: walletClient,
        signedComment: appSignedCommentResponse,
      });

      return response;
    },
  });
}

type UseGalessPostCommentReturnValue = UseMutationResult<
  Hex,
  Error,
  {
    comment: CommentInputSchemaType;
    /**
     * Should the app post the comment immediatelly if user approved the app to act on their behalf?
     *
     * @default true
     */
    submitIfApproved?: boolean;
  }
>;

type UseGaslessPostCommentOptions = {
  /**
   * Should the app post the comment immediatelly if user approved the app to act on their behalf?
   *
   * @default true
   */
  submitIfApproved?: boolean;
  /**
   * Fetches a comment signed by app from app's backend.
   *
   * If user previously approved the app to act on their behalf,
   * the comment will be posted directly if submitIfApproved is set to true,
   * the function should return transaction hash in that case.
   *
   * Otherwise the function should return a signature of the comment.
   */
  fetchCommentSignature: (
    comment: CommentInputSchemaType,
    submitIfApproved: boolean
  ) => Promise<GaslessCommentSignatureResponseSchemaType>;
  /**
   * Function is called if user didn't approve the app to act on their behalf.
   */
  postSignedComment: (signedComment: {
    authorSignature: Hex;
    signedComment: SignGaslessCommentRequiresSigningResponseSchemaType;
  }) => Promise<Hex>;
};

/**
 * Sends a comment using app's funds.
 */
export function useGaslessPostComment({
  fetchCommentSignature,
  postSignedComment,
  submitIfApproved: submitIfApprovedOption = true,
}: UseGaslessPostCommentOptions): UseGalessPostCommentReturnValue {
  const { data: walletClient } = useWalletClient();

  return useMutation({
    async mutationFn({ comment, submitIfApproved = submitIfApprovedOption }) {
      if (!walletClient) {
        throw new Error("Wallet client is not available.");
      }

      const request = CommentInputSchema.parse(comment);

      const commentSignatureResponse =
        GaslessCommentSignatureResponseSchema.parse(
          await fetchCommentSignature(request, submitIfApproved)
        );

      if ("txHash" in commentSignatureResponse) {
        return commentSignatureResponse.txHash;
      }

      const authorSignature = await walletClient.signTypedData(
        commentSignatureResponse.signTypedDataArgs
      );

      return HexSchema.parse(
        await postSignedComment({
          authorSignature,
          signedComment: commentSignatureResponse,
        })
      );
    },
  });
}

type UseApprovePostingCommentsReturnValue = UseMutationResult<
  Hex,
  Error,
  AppNotApprovedStatusResponseSchemaType
>;

type UseApprovePostingCommentsOptions = {
  postApproval: (
    approval: AppNotApprovedStatusResponseSchemaType,
    authorSignature: Hex
  ) => Promise<Hex>;
};

/**
 * Approves sending comments on user's behalf.
 *
 * This operation uses app's funds to pay for gas fees.
 *
 * @example
 * ```
 * import { useApproveApp } from '@modprotocol/comments-protocol-sdk/wagmi';
 *
 * function Component() {
 *   const { mutate } = useApproveApp({
 *     postApproval: async (approval, authorSignature) => {
 *       const response = await fetch('/api/approve-app', {
 *         method: 'POST',
 *         body: JSON.stringify({ approval, authorSignature }),
 *         headers: {
 *           'Content-Type': 'application/json',
 *         },
 *       });
 *
 *       return response.json();
 *     },
 *   });
 *
 *   return <Button onClick={() => {
 *     mutate({
 *       approval: {
 *         approved: false,
 *         signTypedDataArgs: {},
 *       },
 *     });
 *   }}>Approve app</Button>;
 * }
 */
export function useApproveApp({
  postApproval,
}: UseApprovePostingCommentsOptions): UseApprovePostingCommentsReturnValue {
  const { data: walletClient } = useWalletClient();

  return useMutation({
    async mutationFn(approvalStatus) {
      if (!walletClient) {
        throw new Error("Wallet client is not available.");
      }

      const approval = AppNotApprovedStatusResponseSchema.parse(approvalStatus);

      const authorSignature = await walletClient.signTypedData(
        approval.signTypedDataArgs
      );

      return HexSchema.parse(await postApproval(approval, authorSignature));
    },
  });
}

type UseRejectAppReturnValue = UseMutationResult<
  Hex,
  Error,
  AppApprovedStatusResponseSchemaType
>;

export function useRejectApp(): UseRejectAppReturnValue {
  const { data: walletClient } = useWalletClient();

  return useMutation({
    async mutationFn(approval) {
      if (!walletClient) {
        throw new Error("Wallet client is not available.");
      }

      const data = AppApprovedStatusResponseSchema.parse(approval);

      const txHash = await rejectAppApproval({
        approval: data,
        wallet: walletClient,
      });

      return HexSchema.parse(txHash);
    },
  });
}

type UseDeleteCommentAsAuthorReturnValue = UseMutationResult<Hex, Error, Hex>;

/**
 * Deletes a comment as an author. This operation costs author's funds.
 */
export function useDeleteCommentAsAuthor(): UseDeleteCommentAsAuthorReturnValue {
  const { data: walletClient } = useWalletClient();

  return useMutation({
    async mutationFn(commentId) {
      if (!walletClient) {
        throw new Error("Wallet client is not available.");
      }

      const txHash = await deleteCommentAsAuthor({
        commentId: HexSchema.parse(commentId),
        wallet: walletClient,
      });

      return HexSchema.parse(txHash);
    },
  });
}

type UseGaslessDeleteCommentReturnValue = UseMutationResult<
  Hex,
  Error,
  {
    commentId: Hex;
    /**
     * Should the app delete the comment immediatelly if user approved the app to act on their behalf?
     *
     * @default true
     */
    submitIfApproved?: boolean;
  }
>;

type UseGaslessDeleteCommentOptions = {
  /**
   * Fetches a delete operation signed by app from app's backend.
   */
  fetchSignedComment: (data: {
    commentId: Hex;
    submitIfApproved: boolean;
  }) => Promise<GaslessCommentSignatureResponseSchemaType>;
  /**
   * User signed the delete operation. The app should send the delete operation to the chain.
   */
  deleteComment: (data: {
    authorSignature: Hex;
    request: SignGaslessCommentRequiresSigningResponseSchemaType;
  }) => Promise<Hex>;
  /**
   * If true, the comment will be deleted if user already approved the app to act on their behalf.
   *
   * @default true
   */
  submitIfApproved?: boolean;
};

/**
 * Deletes a comment using app's funds.
 *
 * @example
 * ```
 * import { useGaslessDeleteComment } from '@modprotocol/comments-protocol-sdk/wagmi';
 *
 * function Component() {
 *   const { mutate } = useGaslessDeleteComment({
 *     fetchSignedComment: async ({ commentId, submitIfApproved }) => {
 *       const response = await fetch('/api/sign-delete-comment', {
 *         method: 'POST',
 *         body: JSON.stringify({ commentId, submitIfApproved }),
 *         headers: {
 *           'Content-Type': 'application/json',
 *         },
 *       });
 *
 *       return response.json();
 *     },
 *     deleteComment: async ({ authorSignature, request }) => {
 *       const response = await fetch('/api/delete-comment', {
 *         method: 'POST',
 *         body: JSON.stringify({ authorSignature, request }),
 *         headers: {
 *           'Content-Type': 'application/json',
 *         },
 *       });
 *
 *       return response.json();
 *     },
 *   });
 *
 *   return <Button onClick={() => {
 *     mutate({
 *       commentId: '0x00000000....',
 *     });
 *   }}>Delete comment</Button>;
 * }
 * ```
 */
export function useGaslessDeleteComment({
  fetchSignedComment,
  deleteComment,
  submitIfApproved: submitIfApprovedOption = true,
}: UseGaslessDeleteCommentOptions): UseGaslessDeleteCommentReturnValue {
  const { data: walletClient } = useWalletClient();

  return useMutation({
    async mutationFn({ commentId, submitIfApproved = submitIfApprovedOption }) {
      if (!walletClient) {
        throw new Error("Wallet client is not available.");
      }

      const preparedOperationResponse =
        GaslessCommentSignatureResponseSchema.parse(
          await fetchSignedComment({
            commentId: HexSchema.parse(commentId),
            submitIfApproved,
          })
        );

      if ("txHash" in preparedOperationResponse) {
        return preparedOperationResponse.txHash;
      }

      const authorSignature = await walletClient.signTypedData(
        preparedOperationResponse.signTypedDataArgs
      );

      return HexSchema.parse(
        await deleteComment({
          authorSignature,
          request: preparedOperationResponse,
        })
      );
    },
  });
}
