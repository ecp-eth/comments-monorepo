import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { QueryKey, useMutation, useQuery } from "@tanstack/react-query";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { waitForTransactionReceipt } from "@wagmi/core";
import { useAccount, useConfig, useSwitchChain } from "wagmi";
import { fetchAuthorData } from "@ecp.eth/sdk/indexer";
import {
  useCommentEdition,
  useCommentSubmission,
  useConnectAccount,
  useFreshRef,
} from "@ecp.eth/shared/hooks";
import {
  EmbedConfigProviderByTargetURIConfig,
  useEmbedConfig,
} from "../EmbedConfigProvider";
import type { Hex } from "@ecp.eth/sdk/core/schemas";
import { cn } from "@/lib/utils";
import {
  createCommentRepliesQueryKey,
  createRootCommentsQueryKey,
  submitCommentMutationFunction,
  submitEditCommentMutationFunction,
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
import {
  useEditCommentAsAuthor,
  usePostCommentAsAuthor,
} from "@ecp.eth/sdk/comments/react";
import type { Comment } from "@ecp.eth/shared/schemas";
import { z } from "zod";

type OnSubmitFunction = (params: {
  author: Hex;
  content: string;
}) => Promise<void>;

type BaseCommentFormProps = {
  /**
   * @default false
   */
  autoFocus?: boolean;
  disabled?: boolean;
  defaultContent?: string;
  /**
   * Called when user pressed escape or left the form empty or unchanged (blurred with empty or unchanged content)
   */
  onCancel?: () => void;
  /**
   * Called when transaction was created and also successfully processed.
   */
  onSubmitSuccess?: OnSubmitSuccessFunction;
  onSubmit: OnSubmitFunction;
  /**
   * @default "What are your thoughts?"
   */
  placeholder?: string;
  /**
   * @default "Post"
   */
  submitIdleLabel?: string;
  /**
   * @default "Posting..."
   */
  submitPendingLabel?: string;
};

function BaseCommentForm({
  autoFocus,
  defaultContent,
  onCancel,
  onSubmitSuccess,
  onSubmit,
  placeholder = "What are your thoughts?",
  submitIdleLabel = "Comment",
  submitPendingLabel = "Please check your wallet to sign",
}: BaseCommentFormProps) {
  const { address } = useAccount();
  const connectAccount = useConnectAccount();
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const onSubmitSuccessRef = useFreshRef(onSubmitSuccess);
  const [content, setContent] = useState(defaultContent ?? "");

  useTextAreaAutoVerticalResize(textAreaRef);
  // do not auto focus on top level comment box, only for replies
  // auto focusing on top level comment box will cause unwanted scroll
  useTextAreaAutoFocus(textAreaRef, !!autoFocus);

  const submitMutation = useMutation({
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    mutationFn: async (formData: FormData): Promise<void> => {
      try {
        const author = await connectAccount();
        const result = await onSubmit({ author, content });

        return result;
      } catch (e) {
        if (e instanceof z.ZodError) {
          throw new InvalidCommentError(
            e.flatten().fieldErrors as Record<string, string[]>,
          );
        }

        throw e;
      }
    },
    onSuccess() {
      setContent("");
      submitMutation.reset();
      onSubmitSuccessRef.current?.();
    },
  });

  useEffect(() => {
    if (submitMutation.error instanceof InvalidCommentError) {
      textAreaRef.current?.focus();
    }
  }, [submitMutation.error]);

  const isSubmitting = submitMutation.isPending;
  const trimmedContent = content.trim();
  const isContentValid =
    trimmedContent.length > 0 && trimmedContent.length <= MAX_COMMENT_LENGTH;

  return (
    <form
      action={submitMutation.mutateAsync}
      className="flex flex-col gap-2 mb-2"
    >
      <Textarea
        onBlur={() => {
          if (isSubmitting) {
            return;
          }

          if (
            !content ||
            (defaultContent != null && content === defaultContent)
          ) {
            onCancel?.();
          }
        }}
        ref={textAreaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "w-full p-2 min-h-[70px] max-h-[400px] resize-vertical",
          submitMutation.error &&
            submitMutation.error instanceof InvalidCommentError &&
            "border-destructive focus-visible:border-destructive",
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
          {isSubmitting ? submitPendingLabel : submitIdleLabel}
        </Button>
      </div>
      {submitMutation.error && (
        <CommentFormErrors error={submitMutation.error} />
      )}
    </form>
  );
}

type CommentFormProps = Omit<BaseCommentFormProps, "onSubmit"> & {
  /**
   * Called when user starts submitting the comment
   * and transaction is created
   */
  onSubmitStart?: () => void;
  parentId?: Hex;
};

export function CommentForm({
  onSubmitStart,
  parentId,
  ...props
}: CommentFormProps) {
  const wagmiConfig = useConfig();
  const commentSubmission = useCommentSubmission();
  const { switchChainAsync } = useSwitchChain();
  const { targetUri, chainId } =
    useEmbedConfig<EmbedConfigProviderByTargetURIConfig>();
  const onSubmitStartRef = useFreshRef(onSubmitStart);

  const { mutateAsync: postCommentAsAuthor } = usePostCommentAsAuthor();

  const submitCommentMutation = useCallback<OnSubmitFunction>(
    async ({ author, content }) => {
      let queryKey: QueryKey;

      // we need to create the query key because if user wasn't connected the query key from props
      // would not target the query for the user's address
      if (!parentId) {
        queryKey = createRootCommentsQueryKey(author, targetUri);
      } else {
        queryKey = createCommentRepliesQueryKey(author, parentId);
      }

      const pendingOperation = await submitCommentMutationFunction({
        address: author,
        commentRequest: {
          chainId,
          content,
          ...(parentId ? { parentId } : { targetUri }),
        },
        switchChainAsync(chainId) {
          return switchChainAsync({ chainId });
        },
        async writeContractAsync({ signCommentResponse }) {
          const { txHash } = await postCommentAsAuthor({
            comment: signCommentResponse.data,
            appSignature: signCommentResponse.signature,
          });

          return txHash;
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
    [
      chainId,
      commentSubmission,
      onSubmitStartRef,
      parentId,
      postCommentAsAuthor,
      switchChainAsync,
      targetUri,
      wagmiConfig,
    ],
  );

  return <BaseCommentForm {...props} onSubmit={submitCommentMutation} />;
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

type CommentEditFormProps = Omit<
  BaseCommentFormProps,
  "defaultContent" | "onSubmit"
> & {
  /**
   * Comment to edit
   */
  comment: Comment;
  /**
   * Query key to a query where comment is stored
   */
  queryKey: QueryKey;
  /**
   * Called when user starts submitting the comment
   * and transaction is created
   */
  onSubmitStart?: () => void;
};

export function CommentEditForm({
  comment,
  onSubmitStart,
  queryKey,
  ...props
}: CommentEditFormProps) {
  const wagmiConfig = useConfig();
  const commentEdition = useCommentEdition();
  const { switchChainAsync } = useSwitchChain();
  const { chainId } = useEmbedConfig<EmbedConfigProviderByTargetURIConfig>();
  const onSubmitStartRef = useFreshRef(onSubmitStart);

  const { mutateAsync: editCommentAsAuthor } = useEditCommentAsAuthor();

  const submitCommentMutation = useCallback<OnSubmitFunction>(
    async ({ author, content }) => {
      const pendingOperation = await submitEditCommentMutationFunction({
        address: author,
        comment,
        editRequest: {
          chainId,
          content,
        },
        switchChainAsync(chainId) {
          return switchChainAsync({ chainId });
        },
        async writeContractAsync({ signEditCommentResponse }) {
          const { txHash } = await editCommentAsAuthor({
            edit: signEditCommentResponse.data,
            appSignature: signEditCommentResponse.signature,
          });

          return txHash;
        },
      });

      try {
        commentEdition.start({
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

        commentEdition.success({
          queryKey,
          pendingOperation,
        });
      } catch (e) {
        commentEdition.error({
          commentId: pendingOperation.response.data.commentId,
          queryKey,
          error: e instanceof Error ? e : new Error(String(e)),
        });

        throw e;
      }
    },
    [
      chainId,
      comment,
      commentEdition,
      editCommentAsAuthor,
      onSubmitStartRef,
      queryKey,
      switchChainAsync,
      wagmiConfig,
    ],
  );

  return (
    <BaseCommentForm
      {...props}
      defaultContent={comment.content}
      onSubmit={submitCommentMutation}
      submitIdleLabel="Update"
      submitPendingLabel="Updating..."
    />
  );
}
