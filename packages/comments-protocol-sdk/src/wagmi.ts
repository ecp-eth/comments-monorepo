import { useWalletClient } from "wagmi";
import {
  postCommentAsAuthor,
  signCommentForPostingAsAuthor,
  prepareCommentForGaslessPosting,
  postPreparedGaslessComment,
  approvePostingCommentsOnUsersBehalf,
} from "./comments.js";
import type {
  PostingCommentsOnUsersBehalfApprovalStatusResponse,
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
  approve(
    request: PostingCommentsOnUsersBehalfApprovalStatusResponse
  ): Promise<Hex>;
};

type UseApprovePostingCommentsOptions = {
  commentsApiUrl: string;
  chainId: number;
};

/**
 * Approves sending comments on user's behalf
 */
export function useApprovePostingCommentsOnUsersBehalf({
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
