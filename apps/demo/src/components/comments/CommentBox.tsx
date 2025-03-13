import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Hex } from "@ecp.eth/sdk/schemas";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useAccount, useSwitchChain, useWriteContract } from "wagmi";
import { chain } from "../../lib/wagmi";
import { type PendingCommentOperationSchemaType } from "@/lib/schemas";
import {
  postCommentAsAuthorViaCommentsV1,
  postCommentViaYoink,
} from "@/lib/contract";
import { publicEnv } from "@/publicEnv";
import { CommentBoxAuthor } from "./CommentBoxAuthor";
import { useConnectAccount } from "@/hooks/useConnectAccount";
import { z } from "zod";
import { InvalidCommentError } from "./errors";
import { CommentFormErrors } from "./CommentFormErrors";
import { submitCommentMutationFunction } from "./queries";
import type { OnSubmitCommentSuccessFunction } from "./types";
import { useFreshRef } from "@/hooks/useFreshRef";

interface CommentBoxProps {
  /**
   * Called when user blurred text area with empty content
   */
  onLeftEmpty?: () => void;
  placeholder?: string;
  parentId?: Hex;
  onSubmitSuccess: OnSubmitCommentSuccessFunction;
}

export function CommentBox({
  placeholder = "What are your thoughts?",
  parentId,
  onSubmitSuccess,
  onLeftEmpty,
}: CommentBoxProps) {
  const onSubmitSuccessRef = useFreshRef(onSubmitSuccess);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const connectAccount = useConnectAccount();
  const { address } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const [content, setContent] = useState("");
  const { writeContractAsync } = useWriteContract();
  const [formState, setFormState] = useState<"posting" | "yoinking" | "idle">(
    "idle"
  );

  const submitCommentMutation = useMutation({
    mutationFn: async (
      formData: FormData
    ): Promise<PendingCommentOperationSchemaType | undefined> => {
      try {
        const address = await connectAccount();

        const submitAction = formData.get("action") as "post" | "yoink";

        setFormState(submitAction === "post" ? "posting" : "yoinking");

        const result = await submitCommentMutationFunction({
          address,
          commentRequest: {
            chainId: chain.id,
            content,
            targetUri: window.location.href,
            parentId,
          },
          switchChainAsync(chainId) {
            return switchChainAsync({ chainId });
          },
          writeContractAsync(params) {
            if (submitAction === "yoink") {
              return postCommentViaYoink(
                {
                  appSignature: params.signature,
                  commentData: params.data,
                },
                writeContractAsync
              );
            }

            return postCommentAsAuthorViaCommentsV1(
              {
                appSignature: params.signature,
                commentData: params.data,
              },
              writeContractAsync
            );
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
      {address && <CommentBoxAuthor address={address} />}
      {submitCommentMutation.error && (
        <CommentFormErrors error={submitCommentMutation.error} />
      )}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Button
          name="action"
          value="post"
          type="submit"
          className="px-4 py-2 rounded"
          disabled={isSubmitting || !isContentValid}
        >
          {formState === "posting" ? "Posting..." : "Comment"}
        </Button>
        {publicEnv.NEXT_PUBLIC_YOINK_CONTRACT_ADDRESS && (
          <Button
            name="action"
            value="yoink"
            type="submit"
            className="bg-purple-500 text-white px-4 py-2 rounded"
            disabled={isSubmitting || !isContentValid}
          >
            {formState === "yoinking" ? "Yoinking..." : "Yoink with comment"}
          </Button>
        )}
      </div>
    </form>
  );
}
