import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { QueryKey, useMutation, useQuery } from "@tanstack/react-query";
import React, { useEffect, useRef, useState } from "react";
import { waitForTransactionReceipt } from "@wagmi/core";
import { useAccount, useConfig, useSwitchChain, useWriteContract } from "wagmi";
import { CommentsV1Abi } from "@ecp.eth/sdk/abis";
import { COMMENTS_V1_ADDRESS, fetchAuthorData } from "@ecp.eth/sdk";
import {
  useCommentSubmission,
  useConnectAccount,
  useFreshRef,
} from "@ecp.eth/shared/hooks";
import {
  EmbedConfigProviderByTargetURIConfig,
  useEmbedConfig,
} from "../EmbedConfigProvider";
import type { Hex } from "@ecp.eth/sdk/schemas";
import { cn } from "@/lib/utils";
import {
  createCommentRepliesQueryKey,
  createRootCommentsQueryKey,
  submitCommentMutationFunction,
} from "./queries";
import { MAX_COMMENT_LENGTH, TX_RECEIPT_TIMEOUT } from "@/lib/constants";
import { CommentAuthorAvatar } from "./CommentAuthorAvatar";
import { getCommentAuthorNameOrAddress } from "@ecp.eth/shared/helpers";
import { useTextAreaAutoVerticalResize } from "@/hooks/useTextAreaAutoVerticalResize";
import { useTextAreaAutoFocus } from "@/hooks/useTextAreaAutoFocus";
import { useAccountModal } from "@rainbow-me/rainbowkit";
import { publicEnv } from "@/publicEnv";
import { CommentFormErrors } from "./CommentFormErrors";
import { InvalidCommentError } from "./errors";
import type { OnSubmitSuccessFunction } from "@ecp.eth/shared/types";

interface CommentFormProps {
  autoFocus?: boolean;
  /**
   * Called when user blurred text area with empty content
   */
  onLeftEmpty?: () => void;
  /**
   * Called when user starts submitting the comment
   * and transaction is created
   */
  onSubmitStart?: () => void;
  /**
   * Called when comment is successfully submitted
   */
  onSubmitSuccess?: OnSubmitSuccessFunction;
  placeholder?: string;
  initialContent?: string;
  parentId?: Hex;
}

export function CommentForm({
  autoFocus,
  onLeftEmpty,
  onSubmitStart,
  onSubmitSuccess,
  placeholder = "What are your thoughts?",
  initialContent,
  parentId,
}: CommentFormProps) {
  const wagmiConfig = useConfig();
  const { address } = useAccount();
  const commentSubmission = useCommentSubmission();
  const connectAccount = useConnectAccount();
  const { switchChainAsync } = useSwitchChain();
  const { targetUri, chainId } =
    useEmbedConfig<EmbedConfigProviderByTargetURIConfig>();
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const onSubmitSuccessRef = useFreshRef(onSubmitSuccess);
  const onSubmitStartRef = useFreshRef(onSubmitStart);
  const [content, setContent] = useState(initialContent ?? "");

  useTextAreaAutoVerticalResize(textAreaRef);
  // do not auto focus on top level comment box, only for replies
  // auto focusing on top level comment box will cause unwanted scroll
  useTextAreaAutoFocus(textAreaRef, !!autoFocus);

  const postCommentContract = useWriteContract();

  const submitCommentMutation = useMutation({
    mutationFn: async (_formData: FormData): Promise<void> => {
      const address = await connectAccount();

      let queryKey: QueryKey;

      // we need to create the query key because if user wasn't connected the query key from props
      // would not target the query for the user's address
      if (!parentId) {
        queryKey = createRootCommentsQueryKey(address, targetUri);
      } else {
        queryKey = createCommentRepliesQueryKey(address, parentId);
      }

      const pendingOperation = await submitCommentMutationFunction({
        address,
        commentRequest: {
          chainId,
          content,
          targetUri,
          parentId,
        },
        switchChainAsync(chainId) {
          return switchChainAsync({ chainId });
        },
        writeContractAsync({ signCommentResponse }) {
          return postCommentContract.writeContractAsync({
            abi: CommentsV1Abi,
            address: COMMENTS_V1_ADDRESS,
            functionName: "postCommentAsAuthor",
            args: [signCommentResponse.data, signCommentResponse.signature],
          });
        },
      });

      try {
        commentSubmission.start({
          queryKey,
          pendingOperation,
        });

        onSubmitStartRef.current?.();

        const receipt = await waitForTransactionReceipt(wagmiConfig, {
          hash: pendingOperation.txHash,
          timeout: TX_RECEIPT_TIMEOUT,
        });

        if (receipt.status !== "success") {
          throw new Error("Transaction reverted");
        }

        commentSubmission.success({
          queryKey,
          pendingOperation,
        });
      } catch (e) {
        commentSubmission.error({
          commentId: pendingOperation.response.data.id,
          queryKey,
          error: e instanceof Error ? e : new Error(String(e)),
        });

        throw e;
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
  const isContentValid =
    trimmedContent.length > 0 && trimmedContent.length <= MAX_COMMENT_LENGTH;

  return (
    <form
      action={submitCommentMutation.mutate}
      className="flex flex-col gap-2 mb-2"
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
            submitCommentMutation.error instanceof InvalidCommentError &&
            "border-destructive focus-visible:border-destructive"
        )}
        disabled={isSubmitting}
        maxLength={MAX_COMMENT_LENGTH}
      />
      <div className="flex gap-2 justify-between">
        {address && <CommentFormAuthor address={address} />}
        <Button
          className="ml-auto"
          type="submit"
          disabled={isSubmitting || !isContentValid}
          size="sm"
        >
          {isSubmitting ? "Please check your wallet to sign" : "Comment"}
        </Button>
      </div>
      {submitCommentMutation.error && (
        <CommentFormErrors error={submitCommentMutation.error} />
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
