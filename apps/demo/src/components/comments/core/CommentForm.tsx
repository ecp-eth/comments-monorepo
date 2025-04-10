import { Textarea } from "@/components/ui/textarea";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useAccount } from "wagmi";
import { CommentBoxAuthor } from "./CommentBoxAuthor";
import { z } from "zod";
import { InvalidCommentError } from "./errors";
import { CommentFormErrors } from "./CommentFormErrors";
import { useConnectAccount, useFreshRef } from "@ecp.eth/shared/hooks";
import { useCommentActions } from "./CommentActionsContext";
import type { QueryKey } from "@tanstack/react-query";
import type { Hex } from "viem";
import { Button } from "@/components/ui/button";
import type { OnSubmitSuccessFunction } from "@ecp.eth/shared/types";

export interface CommentFormProps<TExtraSubmitData = unknown> {
  /**
   * @default false
   */
  autoFocus?: boolean;
  disabled?: boolean;
  /**
   * Called when user blurred text area with empty content
   */
  onLeftEmpty?: () => void;
  /**
   * Called when transaction was created but not yet processed.
   */
  onSubmitStart?: () => void;
  /**
   * Called when transaction was created and also successfully processed.
   */
  onSubmitSuccess?: OnSubmitSuccessFunction;
  /**
   * Extra data to be passed to post comment
   */
  extra?: TExtraSubmitData;
  placeholder?: string;
  queryKey: QueryKey;
  parentId?: Hex;
  /**
   * @default "Post"
   */
  submitIdleLabel?: string;
  /**
   * @default "Posting..."
   */
  submitPendingLabel?: string;
}

export function CommentForm<TExtraSubmitData = unknown>({
  autoFocus,
  disabled = false,
  placeholder = "What are your thoughts?",
  onLeftEmpty,
  queryKey,
  parentId,
  submitIdleLabel = "Post",
  submitPendingLabel = "Posting...",
  onSubmitStart,
  onSubmitSuccess,
  extra,
}: CommentFormProps<TExtraSubmitData>) {
  const { postComment } = useCommentActions<TExtraSubmitData>();
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const connectAccount = useConnectAccount();
  const { address } = useAccount();
  const [content, setContent] = useState("");
  const [formState, setFormState] = useState<"idle" | "post">("idle");
  const onSubmitSuccessRef = useFreshRef(onSubmitSuccess);
  const onSubmitStartRef = useFreshRef(onSubmitStart);

  const submitCommentMutation = useMutation({
    mutationFn: async (formData: FormData): Promise<void> => {
      try {
        const author = await connectAccount();

        const submitAction = formData.get("action") as "post";

        setFormState(submitAction);

        const result = await postComment({
          comment: {
            author,
            content,
            parentId,
            targetUri: window.location.href,
          },
          queryKey,
          extra,
          onStart: () => {
            onSubmitStartRef.current?.();
          },
        });

        return result;
      } catch (e) {
        if (e instanceof z.ZodError) {
          throw new InvalidCommentError(
            e.flatten().fieldErrors as Record<string, string[]>
          );
        }

        throw e;
      } finally {
        setFormState("idle");
      }
    },
    onSuccess() {
      setContent("");
      submitCommentMutation.reset();
      onSubmitSuccessRef.current?.();
    },
  });

  useEffect(() => {
    if (submitCommentMutation.error instanceof InvalidCommentError) {
      textAreaRef.current?.focus();
    }
  }, [submitCommentMutation.error]);

  const isSubmitting = submitCommentMutation.isPending;
  const trimmedContent = content.trim();
  const isContentValid = trimmedContent.length > 0;

  return (
    <form
      action={submitCommentMutation.mutate}
      className="mb-4 flex flex-col gap-2"
    >
      <Textarea
        autoFocus={autoFocus}
        onBlur={() => {
          if (!content && !isSubmitting) {
            onLeftEmpty?.();
          }
        }}
        name="comment"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder}
        className="w-full p-2 border border-gray-300 rounded"
        disabled={isSubmitting || disabled}
        required
        ref={textAreaRef}
      />
      <div className="flex gap-2 justify-between">
        {address && <CommentBoxAuthor address={address} />}
        <div className="flex gap-2 items-center ml-auto">
          <Button
            name="action"
            value="post"
            type="submit"
            className="px-4 py-2 rounded"
            disabled={isSubmitting || !isContentValid}
          >
            {formState === "post" ? submitPendingLabel : submitIdleLabel}
          </Button>
        </div>
      </div>
      {submitCommentMutation.error && (
        <CommentFormErrors error={submitCommentMutation.error} />
      )}
    </form>
  );
}
