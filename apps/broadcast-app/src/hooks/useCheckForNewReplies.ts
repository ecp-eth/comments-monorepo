import { CHECK_FOR_NEW_REPLIES_INTERVAL } from "@/constants";
import { publicEnv } from "@/env/public";
import { useMarkChannelCommentsAsHavingNewReplies } from "@/queries/channel";
import { COMMENT_TYPE_COMMENT } from "@ecp.eth/sdk";
import type { Hex } from "@ecp.eth/sdk/core";
import { fetchCommentReplies } from "@ecp.eth/sdk/indexer";
import type { Comment } from "@ecp.eth/shared/schemas";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

type UseCheckForNewReplies = {
  viewer: Hex | undefined;
  comment: Comment;
};

export function useCheckForNewReplies({
  comment,
  viewer,
}: UseCheckForNewReplies) {
  const markChannelCommentsAsHavingNewReplies =
    useMarkChannelCommentsAsHavingNewReplies();
  const [isEnabled, setIsEnabled] = useState(false);

  const query = useQuery({
    // we don't want to run the query immediately
    enabled: isEnabled,
    refetchInterval: CHECK_FOR_NEW_REPLIES_INTERVAL,
    queryKey: ["check-for-new-replies", comment.id],
    queryFn: async ({ signal }) => {
      const { cursor } = comment;

      const response = await fetchCommentReplies({
        cursor,
        limit: 1,
        sort: "asc",
        commentId: comment.id,
        chainId: comment.chainId,
        channelId: comment.channelId,
        apiUrl: publicEnv.NEXT_PUBLIC_INDEXER_URL,
        app: publicEnv.NEXT_PUBLIC_APP_SIGNER_ADDRESS,
        commentType: COMMENT_TYPE_COMMENT,
        moderationStatus: ["approved", "pending"],
        signal,
        viewer,
        mode: "flat",
      });

      if (response.results.length > 0) {
        markChannelCommentsAsHavingNewReplies(comment.channelId, viewer);
      }

      return response;
    },
  });

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setIsEnabled(true);
    }, CHECK_FOR_NEW_REPLIES_INTERVAL);

    return () => {
      window.clearTimeout(timeout);
    };
  }, []);

  return query;
}
