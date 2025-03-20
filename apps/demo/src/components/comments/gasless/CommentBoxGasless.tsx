import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useAccount } from "wagmi";
import { useFreshRef } from "@ecp.eth/shared/hooks";
import type { Hex } from "@ecp.eth/sdk/schemas";
import { CommentFormErrors } from "../CommentFormErrors";
import type { OnSubmitSuccessFunction } from "@ecp.eth/shared/types";
import { useSubmitGaslessComment } from "../hooks";
import { InvalidCommentError } from "../errors";
import { CommentBoxAuthor } from "../CommentBoxAuthor";
import { useCommentGaslessContext } from "./CommentGaslessProvider";

interface CommentBoxProps {
  /**
   * Called when user blurred text area with empty content
   */
  onLeftEmpty?: () => void;
  onSubmitSuccess: OnSubmitSuccessFunction;
  placeholder?: string;
  parentId?: Hex;
}

export function CommentBoxGasless({
  onLeftEmpty,
  onSubmitSuccess,
  placeholder = "What are your thoughts?",
  parentId,
}: CommentBoxProps) {
  const { isApproved } = useCommentGaslessContext();
  const onSubmitSuccessRef = useFreshRef(onSubmitSuccess);
  const { address } = useAccount();
  const [content, setContent] = useState("");
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const submitCommentMutation = useSubmitGaslessComment({
    onSuccess(params) {
      setContent("");
      submitCommentMutation.reset();
      onSubmitSuccessRef.current(params);
    },
  });

  const handleFormSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      submitCommentMutation.mutate({
        content,
        isApproved,
        parentId,
        targetUri: window.location.href,
      });
    },
    [content, isApproved, parentId, submitCommentMutation]
  );

  useEffect(() => {
    if (submitCommentMutation.error instanceof InvalidCommentError) {
      textAreaRef.current?.focus();
    }
  }, [submitCommentMutation.error]);

  const isSubmitting = submitCommentMutation.isPending;
  const trimmedContent = content.trim();
  const isContentValid = trimmedContent.length > 0;

  return (
    <form onSubmit={handleFormSubmit} className="mb-4 flex flex-col gap-2">
      <Textarea
        onBlur={() => {
          if (!content && !isSubmitting) {
            onLeftEmpty?.();
          }
        }}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder}
        className="w-full p-2 border border-gray-300 rounded"
        disabled={isSubmitting}
        required
        ref={textAreaRef}
      />
      <div className="flex gap-2 justify-between">
        {address && <CommentBoxAuthor address={address} />}
        <Button
          type="submit"
          className="px-4 py-2 rounded ml-auto"
          disabled={isSubmitting || !isContentValid}
        >
          {isSubmitting ? "Posting..." : "Comment"}
        </Button>
      </div>
      {submitCommentMutation.error && (
        <CommentFormErrors error={submitCommentMutation.error} />
      )}
    </form>
  );
}
