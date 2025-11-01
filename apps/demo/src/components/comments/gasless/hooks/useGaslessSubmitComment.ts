import type { IndexerAPICommentReferencesSchemaType } from "@ecp.eth/sdk/indexer/schemas";
import { useConnectAccount } from "@ecp.eth/shared/hooks";
import type {
  PendingEditCommentOperationSchemaType,
  PendingOperationTypeSchemaType,
  PendingPostCommentOperationSchemaType,
} from "@ecp.eth/shared/schemas";
import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import type { Hex } from "viem";
import { fetchAuthorData } from "@ecp.eth/sdk/indexer";
import { publicEnv } from "@/publicEnv";
import type { MetadataEntry } from "@ecp.eth/sdk/comments";
import { sendPostCommentGaslesslyNotPreapproved } from "../queries/postComment";
import { chain } from "@/lib/clientWagmi";
import { getPublicClient, getWalletClient } from "@wagmi/core";
import { useConfig } from "wagmi";
import { sendEditCommentGaslesslyNotPreapproved } from "../queries/editComment";

type SubmitGaslessCommentVariables =
  | {
      content: string;
      targetUri: string;
      metadata: MetadataEntry[];
      commentType?: number;
      references: IndexerAPICommentReferencesSchemaType;
      gasSponsorship: PendingOperationTypeSchemaType;
    }
  | {
      content: string;
      parentId: Hex;
      metadata: MetadataEntry[];
      commentType?: number;
      references: IndexerAPICommentReferencesSchemaType;
      gasSponsorship: PendingOperationTypeSchemaType;
    };

export function useGaslessSubmitComment(
  options?: UseMutationOptions<
    PendingPostCommentOperationSchemaType,
    Error,
    SubmitGaslessCommentVariables
  >,
) {
  const connectAccount = useConnectAccount();
  const wagmiConfig = useConfig();

  return useMutation<
    PendingPostCommentOperationSchemaType,
    Error,
    SubmitGaslessCommentVariables
  >({
    ...options,
    mutationFn: async ({
      gasSponsorship,
      ...variables
    }: SubmitGaslessCommentVariables) => {
      const address = await connectAccount();
      const walletClient = await getWalletClient(wagmiConfig);

      const resolvedAuthor = await fetchAuthorData({
        apiUrl: publicEnv.NEXT_PUBLIC_COMMENTS_INDEXER_URL,
        address,
      }).catch((e) => {
        console.error(e);
        return undefined;
      });

      if (gasSponsorship == "gasless-preapproved") {
        throw new Error("Gasless preapproved is not supported");
      }

      const result = await sendPostCommentGaslesslyNotPreapproved({
        requestPayload: {
          ...variables,
          author: address,
          chainId: chain.id,
        },
        walletClient: walletClient,
      });

      return {
        response: {
          data: result.response.data,
          hash: result.txHash,
          signature: result.response.signature,
        },
        txHash: result.txHash,
        resolvedAuthor,
        type: "gasless-not-preapproved",
        action: "post",
        chainId: result.chainId,
        state: { status: "pending" },
        references: variables.references,
      };
    },
  });
}

type SubmitGaslessEditCommentVariables = {
  content: string;
  isApproved: boolean;
  commentId: Hex;
  metadata: MetadataEntry[];
};

export function useGaslessEditComment(
  options?: UseMutationOptions<
    Omit<PendingEditCommentOperationSchemaType, "references">,
    Error,
    SubmitGaslessEditCommentVariables
  >,
) {
  const connectAccount = useConnectAccount();
  const wagmiConfig = useConfig();

  return useMutation<
    Omit<PendingEditCommentOperationSchemaType, "references">,
    Error,
    SubmitGaslessEditCommentVariables
  >({
    ...options,
    mutationFn: async ({
      isApproved,
      ...variables
    }: SubmitGaslessEditCommentVariables) => {
      const address = await connectAccount();

      if (isApproved) {
        throw new Error("Gasless preapproved is not supported");
      }

      const walletClient = await getWalletClient(wagmiConfig);
      const publicClient = await getPublicClient(wagmiConfig);

      // wagmi is odd, walletClient is not optional but publicClient is.
      if (!publicClient) {
        throw new Error("Public client not found");
      }

      const result = await sendEditCommentGaslesslyNotPreapproved({
        requestPayload: {
          ...variables,
          author: address,
          chainId: chain.id,
        },
        publicClient,
        walletClient,
      });

      return {
        response: {
          data: result.response.data,
          hash: result.txHash,
          signature: result.response.signature,
        },
        txHash: result.txHash,
        type: "gasless-not-preapproved",
        action: "edit",
        chainId: result.chainId,
        state: { status: "pending" },
      };
    },
  });
}
