import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Hex } from "@ecp.eth/sdk/schemas";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  useAccount,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { chain } from "../../lib/wagmi";
import {
  BadRequestResponseSchema,
  type PendingCommentOperationSchemaType,
  SignCommentRequestBodySchema,
  SignCommentResponseSchema,
} from "@/lib/schemas";
import { useFreshRef } from "@/hooks/useFreshRef";
import {
  postCommentAsAuthorViaCommentsV1,
  postCommentViaYoink,
} from "@/lib/contract";
import { publicEnv } from "@/publicEnv";
import { CommentBoxAuthor } from "./CommentBoxAuthor";
import { useConnectAccount } from "@/hooks/useConnectAccount";
import { z } from "zod";
import { InvalidCommentError, RateLimitedError } from "./errors";
import { CommentFormErrors } from "./CommentFormErrors";

interface CommentBoxProps {
  onSubmit: (pendingComment: PendingCommentOperationSchemaType) => void;
  placeholder?: string;
  parentId?: Hex;
}

export function CommentBox({
  onSubmit,
  placeholder = "What are your thoughts?",
  parentId,
}: CommentBoxProps) {
  const onSubmitRef = useFreshRef(onSubmit);
  const connectAccount = useConnectAccount();
  const { address } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const [content, setContent] = useState("");
  const { writeContractAsync } = useWriteContract();
  const [formState, setFormState] = useState<"posting" | "yoinking" | "idle">(
    "idle"
  );

  const submitMutation = useMutation({
    mutationFn: async (
      formData: FormData
    ): Promise<PendingCommentOperationSchemaType | undefined> => {
      try {
        const address = await connectAccount();

        if (!content.trim()) {
          return;
        }

        const chainId = chain.id;
        const submitAction = formData.get("action") as "post" | "yoink";

        setFormState(submitAction === "post" ? "posting" : "yoinking");

        await switchChainAsync({ chainId });

        const response = await fetch("/api/sign-comment", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(
            SignCommentRequestBodySchema.parse({
              content,
              targetUri: window.location.href,
              parentId,
              author: address,
              chainId,
            })
          ),
        });

        if (!response.ok) {
          if (response.status === 429) {
            throw new RateLimitedError();
          }

          if (response.status === 400) {
            throw new InvalidCommentError(
              BadRequestResponseSchema.parse(await response.json())
            );
          }

          throw new Error("Failed to sign comment");
        }

        const signCommentResponse = SignCommentResponseSchema.parse(
          await response.json()
        );
        const { data: commentData, signature: appSignature } =
          signCommentResponse;
        const txHash =
          submitAction === "yoink"
            ? await postCommentViaYoink(
                {
                  commentData,
                  appSignature,
                },
                writeContractAsync
              )
            : await postCommentAsAuthorViaCommentsV1(
                {
                  commentData,
                  appSignature,
                },
                writeContractAsync
              );

        return {
          chainId,
          txHash,
          response: signCommentResponse,
        };
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
  });

  const { data: receipt, isLoading: isReceiptLoading } =
    useWaitForTransactionReceipt({
      hash: submitMutation.data?.txHash,
    });

  useEffect(() => {
    if (receipt?.status === "success" && submitMutation.data) {
      toast.success("Comment posted");
      onSubmitRef.current?.(submitMutation.data);
      setContent("");
    }
  }, [receipt?.status, onSubmitRef, submitMutation.data]);

  const isLoading = isReceiptLoading || submitMutation.isPending;
  const submitDisabled = isLoading || !content.trim();

  return (
    <form action={submitMutation.mutate} className="mb-4 flex flex-col gap-2">
      <Textarea
        name="comment"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder}
        className="w-full p-2 border border-gray-300 rounded"
        disabled={isLoading}
        required
      />
      {address && <CommentBoxAuthor address={address} />}
      {submitMutation.error && (
        <CommentFormErrors error={submitMutation.error} />
      )}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Button
          name="action"
          value="post"
          type="submit"
          className="px-4 py-2 rounded"
          disabled={submitDisabled}
        >
          {formState === "posting" ? "Posting..." : "Comment"}
        </Button>
        {publicEnv.NEXT_PUBLIC_YOINK_CONTRACT_ADDRESS && (
          <Button
            name="action"
            value="yoink"
            type="submit"
            className="bg-purple-500 text-white px-4 py-2 rounded"
            disabled={submitDisabled}
          >
            {formState === "yoinking" ? "Yoinking..." : "Yoink with comment"}
          </Button>
        )}
      </div>
    </form>
  );
}
