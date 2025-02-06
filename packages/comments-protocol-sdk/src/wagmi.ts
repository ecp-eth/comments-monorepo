import { useWalletClient } from "wagmi";
import {
  postCommentAsAuthor,
  signCommentForPostingAsAuthor,
  prepareCommentForGaslessPosting,
  postPreparedGaslessComment,
  approvePostingCommentsOnUsersBehalf,
  deleteCommentAsAuthor,
} from "./index.js";
import type {
  AppApprovalStatusResponse,
  Hex,
  SignCommentRequest,
} from "./types.js";
import { useMemo, useRef } from "react";

type UsePostCommentAsAuthorReturnValue = {
  postComment: (comment: SignCommentRequest) => Promise<Hex>;
};

type UsePostCommentAsAuthorOptions = {
  commentsContractAddress: Hex;
  chainId: number;
  commentsApiUrl: string;
};

/**
 * Provides methods to sign and post comments an author.
 *
 * Sending the comment using this method costs author's funds..
 */
export function usePostCommentAsAuthor({
  commentsContractAddress,
  chainId,
  commentsApiUrl,
}: UsePostCommentAsAuthorOptions): UsePostCommentAsAuthorReturnValue {
  const { data: walletClient } = useWalletClient();
  const walletClientRef = useRef(walletClient);
  walletClientRef.current = walletClient;
  const chainIdRef = useRef(chainId);
  chainIdRef.current = chainId;
  const commentsApiUrlRef = useRef(commentsApiUrl);
  commentsApiUrlRef.current = commentsApiUrl;
  const commentsContractAddressRef = useRef(commentsContractAddress);
  commentsContractAddressRef.current = commentsContractAddress;

  return useMemo(() => {
    return {
      async postComment(comment) {
        const walletClient = walletClientRef.current;

        if (!walletClient) {
          throw new Error("Wallet client is not available.");
        }

        const signCommentResponse = await signCommentForPostingAsAuthor({
          comment,
          apiUrl: commentsApiUrlRef.current,
          chainId: chainIdRef.current,
          wallet: walletClient,
        });

        const response = await postCommentAsAuthor({
          chainId: chainIdRef.current,
          wallet: walletClient,
          commentsContractAddress: commentsContractAddressRef.current,
          signedComment: signCommentResponse,
        });

        return response;
      },
    };
  }, []);
}

type UseGalessPostCommentReturnValue = {
  postComment: (comment: SignCommentRequest) => Promise<Hex>;
};

type UseGaslessPostCommentOptions = {
  commentsApiUrl: string;
  chainId: number;
};

/**
 * Sends a comment using app's funds.
 */
export function useGaslessPostComment({
  commentsApiUrl,
  chainId,
}: UseGaslessPostCommentOptions): UseGalessPostCommentReturnValue {
  const { data: walletClient } = useWalletClient();
  const walletClientRef = useRef(walletClient);
  walletClientRef.current = walletClient;
  const chainIdRef = useRef(chainId);
  chainIdRef.current = chainId;
  const commentsApiUrlRef = useRef(commentsApiUrl);
  commentsApiUrlRef.current = commentsApiUrl;

  return useMemo(() => {
    return {
      async postComment(comment) {
        const walletClient = walletClientRef.current;

        if (!walletClient) {
          throw new Error("Wallet client is not available.");
        }

        await walletClient.switchChain({ id: chainIdRef.current });

        const prepareCommentResponse = await prepareCommentForGaslessPosting({
          comment,
          apiUrl: commentsApiUrlRef.current,
        });

        if ("txHash" in prepareCommentResponse) {
          return prepareCommentResponse.txHash;
        }

        // Sign comment for once-off approval
        const authorSignature = await walletClient.signTypedData(
          prepareCommentResponse.signTypedDataArgs
        );

        const response = await postPreparedGaslessComment({
          apiUrl: commentsApiUrlRef.current,
          authorSignature,
          preparedComment: prepareCommentResponse,
        });

        return response.txHash;
      },
    };
  }, []);
}

type UseApprovePostingCommentsReturnValue = {
  approve(request: AppApprovalStatusResponse): Promise<Hex>;
};

type UseApprovePostingCommentsOptions = {
  commentsApiUrl: string;
  chainId: number;
};

/**
 * Approves sending comments on user's behalf.
 *
 * This operation uses app's funds to pay for gas fees.
 */
export function useApproveApp({
  commentsApiUrl,
  chainId,
}: UseApprovePostingCommentsOptions): UseApprovePostingCommentsReturnValue {
  const { data: walletClient } = useWalletClient();
  const walletClientRef = useRef(walletClient);
  walletClientRef.current = walletClient;
  const chainIdRef = useRef(chainId);
  chainIdRef.current = chainId;
  const commentsApiUrlRef = useRef(commentsApiUrl);
  commentsApiUrlRef.current = commentsApiUrl;

  return useMemo(() => {
    return {
      async approve(request) {
        const walletClient = walletClientRef.current;

        if (!walletClient) {
          throw new Error("Wallet client is not available.");
        }

        await walletClient.switchChain({ id: chainIdRef.current });

        const authorSignature = await walletClient.signTypedData(
          request.signTypedDataArgs
        );

        const txHash = await approvePostingCommentsOnUsersBehalf({
          apiUrl: commentsApiUrlRef.current,
          authorSignature,
          statusResponse: request,
        });

        return txHash;
      },
    };
  }, []);
}

type UseDeleteCommentAsAuthorReturnValue = {
  deleteComment: (commentId: Hex) => Promise<Hex>;
};

type UseDeleteCommentAsAuthorOptions = {
  commentsContractAddress: Hex;
  chainId: number;
  commentsApiUrl: string;
};

/**
 * Deletes a comment as an author. This operation costs author's funds.
 */
export function useDeleteCommentAsAuthor(
  options: UseDeleteCommentAsAuthorOptions
): UseDeleteCommentAsAuthorReturnValue {
  const { data: walletClient } = useWalletClient();
  const walletClientRef = useRef(walletClient);
  walletClientRef.current = walletClient;
  const chainIdRef = useRef(options.chainId);
  chainIdRef.current = options.chainId;
  const commentsApiUrlRef = useRef(options.commentsApiUrl);
  commentsApiUrlRef.current = options.commentsApiUrl;
  const commentsContractAddressRef = useRef(options.commentsContractAddress);
  commentsContractAddressRef.current = options.commentsContractAddress;

  return useMemo(() => {
    return {
      async deleteComment(commentId) {
        const walletClient = walletClientRef.current;

        if (!walletClient) {
          throw new Error("Wallet client is not available.");
        }

        await walletClient.switchChain({ id: chainIdRef.current });

        const txHash = await deleteCommentAsAuthor({
          commentId,
          commentsContractAddress: commentsContractAddressRef.current,
          wallet: walletClient,
        });

        return txHash;
      },
    };
  }, []);
}
