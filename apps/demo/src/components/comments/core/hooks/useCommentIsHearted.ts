import { COMMENT_REACTION_LIKE_CONTENT } from "@/lib/constants";
import type { Comment } from "@ecp.eth/shared/schemas";
import { useEffect, useMemo, useState } from "react";

export function useCommentIsHearted(comment: Comment) {
  const likedByViewer = useMemo(() => {
    return (
      (comment.viewerReactions?.[COMMENT_REACTION_LIKE_CONTENT]?.length ?? 0) >
      0
    );
  }, [comment.viewerReactions]);
  const [isHearted, setIsHearted] = useState(likedByViewer);

  useEffect(() => {
    setIsHearted(likedByViewer);
  }, [likedByViewer]);

  return isHearted;
}
