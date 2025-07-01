import {
  createCommentRepliesQueryKey,
  createRootCommentsQueryKey,
} from "@/lib/utils";
import { Hex } from "viem";
import { useAccount } from "wagmi";
import { useCurrentUrl } from "./useCurrentUrl";
import { Comment } from "@ecp.eth/shared/schemas";

export const useQueryKeyCreators = () => {
  const { address: viewer } = useAccount();
  const currentUrl = useCurrentUrl();

  return {
    createRootCommentsQueryKey: () => {
      return createRootCommentsQueryKey(viewer, currentUrl);
    },
    createCommentRepliesQueryKey: (commentId: Hex) => {
      return createCommentRepliesQueryKey(viewer, commentId);
    },
    createCommentQueryKey: (comment?: Comment) => {
      if (comment?.parentId) {
        return createCommentRepliesQueryKey(viewer, comment.parentId);
      }

      return createRootCommentsQueryKey(viewer, currentUrl);
    },
  };
};
