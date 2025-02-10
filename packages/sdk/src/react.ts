import {
  useChainId,
  useSignTypedData,
  useSwitchChain,
  useWriteContract,
} from "wagmi";
import {
  postCommentAsAuthor,
  deleteCommentAsAuthor,
  removeAppApproval,
} from "./index.js";
import { useMutation, type UseMutationResult } from "@tanstack/react-query";
import {
  type AppSignedCommentSchemaType,
  type SignCommentByAppRequestSchemaType,
  type Hex,
  AppSignedCommentSchema,
  type CommentInputSchemaType,
  SignCommentByAppRequestSchema,
  CommentInputSchema,
  type GaslessCommentSignatureResponseSchemaType,
  GaslessCommentSignatureResponseSchema,
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
 * import { usePostCommentAsAuthor } from '@ecp.eth/sdk/react';
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
 * import { usePostCommentAsAuthor } from '@ecp.eth/sdk/react';
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
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();

  return useMutation({
    async mutationFn({ comment }) {
      const appSignedCommentResponse = AppSignedCommentSchema.parse(
        await fetchSignTypedData({
          comment: SignCommentByAppRequestSchema.parse(comment),
        })
      );

      if (appSignedCommentResponse.chainId !== chainId) {
        await switchChainAsync({
          chainId: appSignedCommentResponse.chainId,
        });
      }

      const response = await postCommentAsAuthor({
        signedComment: appSignedCommentResponse,
        writeContract: writeContractAsync,
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
  const { signTypedDataAsync } = useSignTypedData();

  return useMutation({
    async mutationFn({ comment }) {
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

      const authorSignature = await signTypedDataAsync(
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

type UseApprovePostingCommentsReturnValue<TExtraVariables = {}> =
  UseMutationResult<
    Hex,
    Error,
    TExtraVariables & {
      signTypedDataArgs: SignTypedDataParameters;
    }
  >;

type UseApprovePostingCommentsOptions<TExtraVariables = {}> = {
  postApproval: (
    params: TExtraVariables & {
      signTypedDataArgs: SignTypedDataParameters;
      authorSignature: Hex;
    }
  ) => Promise<Hex>;
};

/**
 * Approves sending comments on user's behalf.
 *
 * This operation uses app's funds to pay for gas fees.
 *
 * @example
 * ```
 * import { useApproveApp } from '@ecp.eth/sdk/react';
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
export function useApproveApp<TExtraVariables = {}>({
  postApproval,
}: UseApprovePostingCommentsOptions<TExtraVariables>): UseApprovePostingCommentsReturnValue<TExtraVariables> {
  const { signTypedDataAsync } = useSignTypedData();

  return useMutation({
    async mutationFn(variables) {
      const authorSignature = await signTypedDataAsync(
        variables.signTypedDataArgs
      );

      return HexSchema.parse(
        await postApproval({ ...variables, authorSignature })
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
  const { writeContractAsync } = useWriteContract();

  return useMutation({
    async mutationFn({ appSigner }) {
      const txHash = await removeAppApproval({
        appSigner,
        writeContract: writeContractAsync,
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
  const { writeContractAsync } = useWriteContract();

  return useMutation({
    async mutationFn(commentId) {
      const txHash = await deleteCommentAsAuthor({
        commentId: HexSchema.parse(commentId),
        writeContract: writeContractAsync,
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
 * import { useGaslessDeleteComment } from '@ecp.eth/sdk/react';
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
  const { signTypedDataAsync } = useSignTypedData();

  return useMutation({
    async mutationFn({ commentId }) {
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

      const authorSignature = await signTypedDataAsync(
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
