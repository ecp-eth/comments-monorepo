import { useWalletClient } from "wagmi";
import {
  postCommentAsAuthor,
  signCommentForPostingAsAuthor,
  type SignCommentResponse,
  type SignCommentRequest,
} from "./post-comment.js";
import type { Hex } from "./types.js";
import { useMemo, useRef } from "react";

type UsePostCommentAsAuthorReturnValue = {
  postComment: (signedComment: SignCommentResponse) => Promise<Hex>;
  signComment: (comment: SignCommentRequest) => Promise<SignCommentResponse>;
};

type UsePostCommentAsAuthorOptions = {
  commentsContractAddress: Hex;
  chainId: number;
  commentsApiUrl: string;
};

/**
 * Provides methods to sign and post comments an author.
 *
 * Sending the comment using this method costs author's funds.
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
      postComment(signedComment) {
        const walletClient = walletClientRef.current;

        if (!walletClient) {
          throw new Error("Wallet client is not available.");
        }

        return postCommentAsAuthor({
          chainId: chainIdRef.current,
          wallet: walletClient,
          commentsContractAddress: commentsContractAddressRef.current,
          signedComment,
        });
      },
      signComment(comment) {
        return signCommentForPostingAsAuthor({
          comment,
          apiUrl: commentsApiUrlRef.current,
        });
      },
    };
  }, []);
}
