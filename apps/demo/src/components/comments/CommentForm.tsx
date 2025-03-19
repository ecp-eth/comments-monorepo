import { Textarea } from "@/components/ui/textarea";
import type { Hex } from "@ecp.eth/sdk/schemas";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useAccount } from "wagmi";
import { type PendingCommentOperationSchemaType } from "@/lib/schemas";
import { CommentBoxAuthor } from "./CommentBoxAuthor";
import { z } from "zod";
import { InvalidCommentError } from "./errors";
import { CommentFormErrors } from "./CommentFormErrors";
import type { OnSubmitSuccessFunction } from "@ecp.eth/shared/types";
import { useConnectAccount, useFreshRef } from "@ecp.eth/shared/hooks";

type SubmitFunctionParams<TSubmitAction extends string> = {
  address: Hex;
  content: string;
  submitAction: TSubmitAction;
};

export type OnSubmitFunction<TSubmitAction extends string> = (
  params: SubmitFunctionParams<TSubmitAction>
) => Promise<PendingCommentOperationSchemaType>;

type RenderSubmitButtonFunctionParams<TSubmitAction extends string> = {
  isSubmitting: boolean;
  isContentValid: boolean;
  formState: "idle" | TSubmitAction;
};

export type RenderSubmitButtonFunction<TSubmitAction extends string> = (
  params: RenderSubmitButtonFunctionParams<TSubmitAction>
) => React.ReactNode;

interface CommentFormProps<TSubmitAction extends string = string> {
  /**
   * Called when user blurred text area with empty content
   */
  onLeftEmpty?: () => void;
  placeholder?: string;
  onSubmit: OnSubmitFunction<TSubmitAction>;
  onSubmitSuccess: OnSubmitSuccessFunction;
  renderSubmitButton: RenderSubmitButtonFunction<TSubmitAction>;
}

export function CommentForm<TSubmitAction extends string = string>({
  placeholder = "What are your thoughts?",
  onSubmit,
  onSubmitSuccess,
  onLeftEmpty,
  renderSubmitButton,
}: CommentFormProps<TSubmitAction>) {
  const onSubmitSuccessRef = useFreshRef(onSubmitSuccess);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const connectAccount = useConnectAccount();
  const { address } = useAccount();
  const [content, setContent] = useState("");
  const [formState, setFormState] = useState<"idle" | TSubmitAction>("idle");

  const submitCommentMutation = useMutation({
    mutationFn: async (
      formData: FormData
    ): Promise<PendingCommentOperationSchemaType> => {
      try {
        const address = await connectAccount();

        const submitAction = formData.get("action") as TSubmitAction;

        setFormState(submitAction);

        const result = await onSubmit({
          address,
          content,
          submitAction,
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
    onSuccess(params) {
      setContent("");
      submitCommentMutation.reset();
      onSubmitSuccessRef.current(params);
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
        disabled={isSubmitting}
        required
        ref={textAreaRef}
      />
      <div className="flex gap-2 justify-between">
        {address && <CommentBoxAuthor address={address} />}
        <div className="flex gap-2 items-center ml-auto">
          {renderSubmitButton({
            isSubmitting,
            isContentValid,
            formState,
          })}
        </div>
      </div>
      {submitCommentMutation.error && (
        <CommentFormErrors error={submitCommentMutation.error} />
      )}
    </form>
  );
}
