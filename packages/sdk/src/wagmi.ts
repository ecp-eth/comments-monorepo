import { useWalletClient } from "wagmi";
import {
  postCommentAsAuthor,
  deleteCommentAsAuthor,
  removeAppApproval,
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
  type SignGaslessCommentApprovedResponseSchemaType,
} from "./schemas.js";
import type { SignTypedDataParameters } from "viem";

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
  fetchSignTypedData: (params: {
    comment: SignCommentByAppRequestSchemaType;
  }) => Promise<AppSignedCommentSchemaType>;
};

/**
 * Posts a comment as an author. This operations costs author's funds.
 *
 * @example
 * ```
 * import { usePostCommentAsAuthor } from '@ecp.eth/sdk/wagmi';
 *
 * function Component() {
 *   const { mutate } = usePostCommentAsAuthor({
 *     fetchSignTypedData: async ({ comment }) => {
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
 * import { usePostCommentAsAuthor } from '@ecp.eth/sdk/wagmi';
 *
 * function Component() {
 *   const { mutate } = usePostCommentAsAuthor({
 *     fetchSignTypedData: async ({ comment }) => {
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
  fetchSignTypedData,
}: UsePostCommentAsAuthorOptions): UsePostCommentAsAuthorReturnValue {
  const { data: walletClient } = useWalletClient();

  return useMutation({
    async mutationFn({ comment }) {
      if (!walletClient) {
        throw new Error("Wallet client is not available.");
      }

      const appSignedCommentResponse = AppSignedCommentSchema.parse(
        await fetchSignTypedData({
          comment: SignCommentByAppRequestSchema.parse(comment),
        })
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
  }
>;

type UseGaslessPostCommentOptions<TExtraSignTypeDataValue = {}> = {
  /**
   * Fetches a comment signed by app from app's backend.
   *
   * If function returs txHash then onSignatureComplete won't be called
   * and the operation will be finished.
   *
   * Otherwise the function should return a signature of the comment.
   */
  fetchSignTypedData: (params: {
    comment: CommentInputSchemaType;
  }) => Promise<
    | Extract<GaslessCommentSignatureResponseSchemaType, { txHash: Hex }>
    | (Exclude<GaslessCommentSignatureResponseSchemaType, { txHash: Hex }> &
        TExtraSignTypeDataValue)
  >;
  /**
   * Function is called if user didn't approve the app to act on their behalf.
   */
  onSignatureComplete: (
    signedComment: TExtraSignTypeDataValue & {
      authorSignature: Hex;
      signTypedDataArgs: SignTypedDataParameters;
    }
  ) => Promise<Hex>;
};

/**
 * Sends a comment using app's funds.
 */
export function useGaslessPostComment<TExtraSignTypeDataValue = {}>({
  fetchSignTypedData,
  onSignatureComplete,
}: UseGaslessPostCommentOptions<TExtraSignTypeDataValue>): UseGalessPostCommentReturnValue {
  const { data: walletClient } = useWalletClient();

  return useMutation({
    async mutationFn({ comment }) {
      if (!walletClient) {
        throw new Error("Wallet client is not available.");
      }

      const commentSignatureResponse =
        GaslessCommentSignatureResponseSchema.parse(
          await fetchSignTypedData({
            comment: CommentInputSchema.parse(comment),
          })
        );

      if ("txHash" in commentSignatureResponse) {
        return (
          commentSignatureResponse as SignGaslessCommentApprovedResponseSchemaType
        ).txHash;
      }

      const authorSignature = await walletClient.signTypedData(
        commentSignatureResponse.signTypedDataArgs
      );

      return HexSchema.parse(
        await onSignatureComplete({
          ...commentSignatureResponse,
          authorSignature,
        } as TExtraSignTypeDataValue & {
          authorSignature: Hex;
          signTypedDataArgs: SignTypedDataParameters;
        })
      );
    },
  });
}

type UseApprovePostingCommentsReturnValue = UseMutationResult<
  Hex,
  Error,
  {
    signTypedDataArgs: SignTypedDataParameters;
  }
>;

type UseApprovePostingCommentsOptions = {
  postApproval: (params: {
    signTypedDataArgs: SignTypedDataParameters;
    authorSignature: Hex;
  }) => Promise<Hex>;
};

/**
 * Approves sending comments on user's behalf.
 *
 * This operation uses app's funds to pay for gas fees.
 *
 * @example
 * ```
 * import { useApproveApp } from '@ecp.eth/sdk/wagmi';
 *
 * function Component() {
 *   const { mutate } = useApproveApp({
 *     postApproval: async ({ approval, authorSignature }) => {
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
    async mutationFn({ signTypedDataArgs }) {
      if (!walletClient) {
        throw new Error("Wallet client is not available.");
      }

      const authorSignature =
        await walletClient.signTypedData(signTypedDataArgs);

      return HexSchema.parse(
        await postApproval({ signTypedDataArgs, authorSignature })
      );
    },
  });
}

type UseRemoveApprovalReturnValue = UseMutationResult<
  Hex,
  Error,
  {
    appSigner: Hex;
  }
>;

/**
 * Removes app approval to post comments on user's behalf.
 *
 * This operation uses user's funds.
 */
export function useRemoveApproval(): UseRemoveApprovalReturnValue {
  const { data: walletClient } = useWalletClient();

  return useMutation({
    async mutationFn({ appSigner }) {
      if (!walletClient) {
        throw new Error("Wallet client is not available.");
      }

      const txHash = await removeAppApproval({
        appSigner,
        wallet: walletClient,
      });

      return txHash;
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
  }
>;

type UseGaslessDeleteCommentOptions<TExtraSignTypeDataValue = {}> = {
  /**
   * Fetches a delete operation signed by app from app's backend.
   */
  fetchSignTypedData: (data: {
    commentId: Hex;
  }) => Promise<
    | Extract<GaslessCommentSignatureResponseSchemaType, { txHash: Hex }>
    | (Exclude<GaslessCommentSignatureResponseSchemaType, { txHash: Hex }> &
        TExtraSignTypeDataValue)
  >;
  /**
   * User signed the delete operation. The app should send the delete operation to the chain.
   */
  onSignatureComplete: (
    data: TExtraSignTypeDataValue & {
      authorSignature: Hex;
      signTypedDataArgs: SignTypedDataParameters;
    }
  ) => Promise<Hex>;
};

/**
 * Deletes a comment using app's funds.
 *
 * @example
 * ```
 * import { useGaslessDeleteComment } from '@ecp.eth/sdk/wagmi';
 *
 * function Component() {
 *   const { mutate } = useGaslessDeleteComment({
 *     fetchSignTypedData: async ({ commentId }) => {
 *       const response = await fetch('/api/sign-delete-comment', {
 *         method: 'POST',
 *         body: JSON.stringify({ commentId }),
 *         headers: {
 *           'Content-Type': 'application/json',
 *         },
 *       });
 *
 *       return response.json();
 *     },
 *     onSignatureComplete: async ({ authorSignature, request }) => {
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
export function useGaslessDeleteComment<TExtraSignTypeDataValue = {}>({
  fetchSignTypedData,
  onSignatureComplete,
}: UseGaslessDeleteCommentOptions<TExtraSignTypeDataValue>): UseGaslessDeleteCommentReturnValue {
  const { data: walletClient } = useWalletClient();

  return useMutation({
    async mutationFn({ commentId }) {
      if (!walletClient) {
        throw new Error("Wallet client is not available.");
      }

      const preparedOperationResponse =
        GaslessCommentSignatureResponseSchema.parse(
          await fetchSignTypedData({
            commentId: HexSchema.parse(commentId),
          })
        );

      if ("txHash" in preparedOperationResponse) {
        return (
          preparedOperationResponse as SignGaslessCommentApprovedResponseSchemaType
        ).txHash;
      }

      const authorSignature = await walletClient.signTypedData(
        preparedOperationResponse.signTypedDataArgs
      );

      return HexSchema.parse(
        await onSignatureComplete({
          ...preparedOperationResponse,
          authorSignature,
        } as TExtraSignTypeDataValue & {
          authorSignature: Hex;
          signTypedDataArgs: SignTypedDataParameters;
        })
      );
    },
  });
}
