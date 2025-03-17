import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useAccount } from "wagmi";
import { useFreshRef } from "@/hooks/useFreshRef";
import type { Hex } from "@ecp.eth/sdk/schemas";
import { CommentFormErrors } from "../CommentFormErrors";
import type { OnSubmitSuccessFunction } from "@ecp.eth/shared/types";
import { useSubmitGaslessComment } from "../hooks";
import { InvalidCommentError } from "../errors";
import { CommentBoxAuthor } from "../CommentBoxAuthor";

interface CommentBoxProps {
  /**
   * Called when user blurred text area with empty content
   */
  onLeftEmpty?: () => void;
  isAppSignerApproved?: boolean;
  onSubmitSuccess: OnSubmitSuccessFunction;
  placeholder?: string;
  parentId?: Hex;
}

export function CommentBoxGasless({
  onLeftEmpty,
  onSubmitSuccess,
  placeholder = "What are your thoughts?",
  parentId,
  isAppSignerApproved: isApproved = false,
}: CommentBoxProps) {
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
      {address && <CommentBoxAuthor address={address} />}
      {submitCommentMutation.error && (
        <CommentFormErrors error={submitCommentMutation.error} />
      )}
      <div className="flex items-center text-sm text-gray-500">
        <Button
          type="submit"
          className="px-4 py-2 rounded"
          disabled={isSubmitting || !isContentValid}
        >
          {isSubmitting ? "Posting..." : "Comment"}
        </Button>
      </div>
    </form>
  );
}
