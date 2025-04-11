import { COMMENTS_V1_ADDRESS, CommentsV1Abi } from "@ecp.eth/sdk";
import { useCallback } from "react";
import type { Hex } from "viem";
import {
  getChainId,
  waitForTransactionReceipt,
  writeContract,
} from "viem/actions";
import { useConnectorClient } from "wagmi";
import { useCommentDeletion } from "@ecp.eth/shared/hooks";
import type { PendingDeleteCommentOperationSchemaType } from "@ecp.eth/shared/schemas";
import type { QueryKey } from "@tanstack/react-query";

type OnCommentDeleteParams = {
  commentId: Hex;
  queryKey: QueryKey;
};

type OnCommentDelete = (params: OnCommentDeleteParams) => Promise<void>;

export function useDeleteComment(): OnCommentDelete {
  const commentDeletion = useCommentDeletion();
  const { data: client } = useConnectorClient();

  return useCallback(
    async (params: OnCommentDeleteParams) => {
      try {
        if (!client) {
          throw new Error("No client");
        }

        const txHash = await writeContract(client, {
          address: COMMENTS_V1_ADDRESS,
          abi: CommentsV1Abi,
          functionName: "deleteCommentAsAuthor",
          args: [params.commentId],
        });

        const chainId = await getChainId(client);

        const pendingOperation: PendingDeleteCommentOperationSchemaType = {
          action: "delete",
          chainId,
          commentId: params.commentId,
          state: { status: "pending" },
          type: "non-gasless",
          txHash,
        };

        commentDeletion.start({
          pendingOperation,
          queryKey: params.queryKey,
        });

        const txReceipt = await waitForTransactionReceipt(client, {
          hash: txHash,
        });

        if (txReceipt.status !== "success") {
          throw new Error("Transaction reverted");
        }

        commentDeletion.success({
          pendingOperation,
          queryKey: params.queryKey,
        });
      } catch (e) {
        commentDeletion.error({
          commentId: params.commentId,
          queryKey: params.queryKey,
          error: e instanceof Error ? e : new Error(String(e)),
        });

        throw e;
      }
    },
    [client]
  );
}
