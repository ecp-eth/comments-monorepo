import { postComment } from "../lib/comments";
import { SignPostCommentRequestPayloadSchema } from "@ecp.eth/shared/schemas/signer-api/post";
import { useMutation } from "@tanstack/react-query";
import type { z } from "zod";

export function usePostComment() {
  return useMutation({
    mutationFn: (
      comment: z.input<typeof SignPostCommentRequestPayloadSchema>,
    ) => {
      return postComment(comment);
    },
  });
}
