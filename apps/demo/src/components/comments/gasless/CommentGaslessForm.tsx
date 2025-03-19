import type { Hex } from "viem";
import { CommentForm, type OnSubmitFunction } from "../CommentForm";
import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import type { OnSubmitSuccessFunction } from "@ecp.eth/shared/types";
import { useSubmitGaslessComment } from "../hooks";
import { useCommentGaslessContext } from "./CommentGaslessProvider";

type CommentGaslessFormProps = {
  parentId?: Hex;
  onSubmitSuccess: OnSubmitSuccessFunction;
};

export function CommentGaslessForm({
  parentId,
  onSubmitSuccess,
}: CommentGaslessFormProps) {
  const { isApproved } = useCommentGaslessContext();
  const submitCommentMutation = useSubmitGaslessComment();

  const handleSubmitComment = useCallback<OnSubmitFunction<"post">>(
    async ({ content }) => {
      const result = await submitCommentMutation.mutateAsync({
        content,
        isApproved,
        parentId,
        targetUri: window.location.href,
      });

      return result;
    },
    [isApproved, parentId, submitCommentMutation]
  );

  return (
    <CommentForm
      onSubmit={handleSubmitComment}
      onSubmitSuccess={onSubmitSuccess}
      renderSubmitButton={({ isSubmitting, isContentValid, formState }) => (
        <Button
          name="action"
          value="post"
          type="submit"
          className="px-4 py-2 rounded"
          disabled={isSubmitting || !isContentValid}
        >
          {formState === "post" ? "Posting..." : "Comment"}
        </Button>
      )}
    />
  );
}
