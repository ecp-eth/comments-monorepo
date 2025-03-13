import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQuery } from "@tanstack/react-query";
import React, { useEffect, useRef, useState } from "react";
import { useAccount, useSwitchChain, useWriteContract } from "wagmi";
import { CommentsV1Abi } from "@ecp.eth/sdk/abis";
import { chains } from "../../lib/wagmi";
import { COMMENTS_V1_ADDRESS, fetchAuthorData } from "@ecp.eth/sdk";
import { useFreshRef } from "@/hooks/useFreshRef";
import { useEmbedConfig } from "../EmbedConfigProvider";
import type { PendingCommentOperationSchemaType } from "@/lib/schemas";
import type { Hex } from "@ecp.eth/sdk/schemas";
import { cn } from "@/lib/utils";
import {
  submitCommentMutationFunction,
  SubmitCommentMutationValidationError,
} from "./queries";
import { MAX_COMMENT_LENGTH } from "@/lib/constants";
import { CommentAuthorAvatar } from "./CommentAuthorAvatar";
import { getCommentAuthorNameOrAddress } from "./helpers";
import { useTextAreaAutoVerticalResize } from "@/hooks/useTextAreaAutoVerticalResize";
import { useTextAreaAutoFocus } from "@/hooks/useTextAreaAutoFocus";
import { useConnectAccount } from "@/hooks/useConnectAccount";
import { useAccountModal } from "@rainbow-me/rainbowkit";
import { publicEnv } from "@/publicEnv";

export type OnSubmitSuccessFunction = (
  params: PendingCommentOperationSchemaType
) => void;

interface CommentBoxProps {
  /**
   * Called when user blurred text area with empty content
   */
  onLeftEmpty?: () => void;
  onSubmitSuccess: OnSubmitSuccessFunction;
  placeholder?: string;
  parentId?: Hex;
  initialContent?: string;
}

export function CommentForm({
  onLeftEmpty,
  onSubmitSuccess,
  placeholder = "What are your thoughts?",
  parentId,
  initialContent,
}: CommentBoxProps) {
  const { address } = useAccount();
  const connectAccount = useConnectAccount();
  const { switchChainAsync } = useSwitchChain();
  const { targetUri } = useEmbedConfig();
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const onSubmitSuccessRef = useFreshRef(onSubmitSuccess);
  const [content, setContent] = useState(initialContent ?? "");
  useTextAreaAutoVerticalResize(textAreaRef);
  // do not auto focus on top level comment box, only for replies
  // auto focusing on top level comment box will cause unwanted scroll
  useTextAreaAutoFocus(textAreaRef, parentId != null);

  const postCommentContract = useWriteContract();

  const submitCommentMutation = useMutation({
    mutationFn: async (
      e: React.FormEvent
    ): Promise<PendingCommentOperationSchemaType> => {
      e.preventDefault();

      const address = await connectAccount();

      return submitCommentMutationFunction({
        address,
        commentRequest: {
          chainId: chains[0].id,
          content,
          targetUri,
          parentId,
        },
        switchChainAsync(chainId) {
          return switchChainAsync({ chainId });
        },
        writeContractAsync(params) {
          return postCommentContract.writeContractAsync({
            abi: CommentsV1Abi,
            address: COMMENTS_V1_ADDRESS,
            functionName: "postCommentAsAuthor",
            args: [params.data, params.signature],
          });
        },
      });
    },
    onSuccess(params) {
      setContent("");
      submitCommentMutation.reset();
      onSubmitSuccessRef.current(params);
    },
  });

  useEffect(() => {
    if (
      submitCommentMutation.error instanceof
      SubmitCommentMutationValidationError
    ) {
      textAreaRef.current?.focus();
    }
  }, [submitCommentMutation.error]);

  const isSubmitting = submitCommentMutation.isPending;
  const trimmedContent = content.trim();
  const isContentValid =
    trimmedContent.length > 0 && trimmedContent.length <= MAX_COMMENT_LENGTH;

  return (
    <form
      onSubmit={submitCommentMutation.mutate}
      className={cn("flex flex-col gap-2", !address && "opacity-20")}
    >
      <Textarea
        onBlur={() => {
          if (!content && !isSubmitting) {
            onLeftEmpty?.();
          }
        }}
        ref={textAreaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "w-full p-2 min-h-[70px] max-h-[400px] resize-vertical",
          submitCommentMutation.error &&
            submitCommentMutation.error instanceof
              SubmitCommentMutationValidationError &&
            "border-destructive focus-visible:border-destructive"
        )}
        disabled={isSubmitting}
        maxLength={MAX_COMMENT_LENGTH}
      />
      <div className="flex gap-2 justify-between">
        {address && <CommentFormAuthor address={address} />}
        <Button
          type="submit"
          disabled={isSubmitting || !isContentValid}
          size="sm"
        >
          {isSubmitting ? "Please check your wallet to sign" : "Comment"}
        </Button>
      </div>
      {submitCommentMutation.error && (
        <div className="text-xs text-destructive">
          {submitCommentMutation.error.message}
        </div>
      )}
    </form>
  );
}

function CommentFormAuthor({ address }: { address: Hex }) {
  const { openAccountModal } = useAccountModal();
  const queryResult = useQuery({
    queryKey: ["author", address],
    queryFn: () => {
      return fetchAuthorData({
        address,
        apiUrl: publicEnv.NEXT_PUBLIC_COMMENTS_INDEXER_URL,
      });
    },
  });

  return (
    <div
      className="flex flex-row gap-2 items-center overflow-hidden"
      title={`Publishing as ${getCommentAuthorNameOrAddress(queryResult.data ?? { address })}`}
    >
      <CommentAuthorAvatar author={queryResult.data ?? { address }} />
      <div className="flex-grow text-xs text-muted-foreground truncate">
        {getCommentAuthorNameOrAddress(queryResult.data ?? { address })}
      </div>

      {openAccountModal && (
        <button
          className="text-account-edit-link text-xs"
          onClick={() => openAccountModal()}
          type="button"
        >
          edit
        </button>
      )}
    </div>
  );
}
