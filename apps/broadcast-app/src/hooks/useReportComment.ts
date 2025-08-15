import { createReportCommentTypedData } from "@ecp.eth/sdk/comments";
import { reportComment } from "@ecp.eth/sdk/indexer";
import type { Comment } from "@ecp.eth/shared/schemas";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useSignTypedData } from "wagmi";
import { publicEnv } from "@/env/public";
import { UserRejectedRequestError } from "viem";

type UseReportCommentOptions = {
  comment: Comment;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
};

export function useReportComment({
  comment,
  onSuccess,
  onError,
}: UseReportCommentOptions) {
  const { signTypedDataAsync } = useSignTypedData();

  return useMutation({
    mutationFn: async (formData: FormData) => {
      const reason = formData.get("reason");
      const typedData = createReportCommentTypedData({
        chainId: comment.chainId,
        commentId: comment.id,
        reportee: comment.author.address,
        message: reason?.toString().trim(),
      });

      const signature = await signTypedDataAsync(typedData);

      await reportComment({
        chainId: comment.chainId,
        commentId: comment.id,
        reportee: comment.author.address,
        message: reason?.toString().trim(),
        signature,
        apiUrl: publicEnv.NEXT_PUBLIC_INDEXER_URL,
      });
    },
    onSuccess() {
      toast.success("Comment reported successfully");
      onSuccess?.();
    },
    onError(error) {
      if (error instanceof UserRejectedRequestError) {
        toast.error("Signing rejected");
      } else {
        console.error(error);
        toast.error("Failed to report comment");
      }
      onError?.(error);
    },
  });
}
