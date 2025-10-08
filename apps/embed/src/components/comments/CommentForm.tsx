import { Button } from "@/components/ui/button";
import { QueryKey, useMutation, useQuery } from "@tanstack/react-query";
import React, { useCallback, useRef } from "react";
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
import { submitPostCommentMutationFunction } from "./queries/postComment";
import { submitEditCommentMutationFunction } from "./queries/editComment";
import {
  ALLOWED_UPLOAD_MIME_TYPES,
  MAX_COMMENT_LENGTH,
  MAX_UPLOAD_FILE_SIZE,
  TX_RECEIPT_TIMEOUT,
} from "@/lib/constants";
import { CommentAuthorAvatar } from "./CommentAuthorAvatar";
import { getCommentAuthorNameOrAddress } from "@ecp.eth/shared/helpers";
import { useAccountModal, useChainModal } from "@rainbow-me/rainbowkit";
import { publicEnv } from "@/publicEnv";
import { CommentFormErrors } from "@ecp.eth/shared/components/CommentFormErrors";
import { InvalidCommentError } from "@ecp.eth/shared/errors";
import type { OnSubmitSuccessFunction } from "@ecp.eth/shared/types";
import type { Comment } from "@ecp.eth/shared/schemas";
import { z } from "zod";
import { Editor, type EditorRef } from "@ecp.eth/react-editor/editor";
import { extractReferences } from "@ecp.eth/react-editor/extract-references";
import {
  useIndexerSuggestions,
  usePinataUploadFiles,
} from "@ecp.eth/react-editor/hooks";
import { GenerateUploadUrlResponseSchema } from "@/lib/schemas";
import type { IndexerAPICommentReferencesSchemaType } from "@ecp.eth/sdk/indexer";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { suggestionsTheme } from "./editorTheme";
import { useReadWriteContractAsync } from "@/hooks/useReadWriteContractAsync";
import { GaslessIndicator } from "./GaslessIndicator";
import { ApprovalSwitch } from "./ApprovalSwitch";

type OnSubmitFunction = (params: {
  author: Hex;
  content: string;
  references: IndexerAPICommentReferencesSchemaType;
}) => Promise<void>;

type BaseCommentFormProps = {
  /**
   * @default false
   */
  autoFocus?: boolean;
  disabled?: boolean;
  /**
   * Default comment content, will be parsed as markdown.
   */
  defaultContent?: {
    content: string;
    references: IndexerAPICommentReferencesSchemaType;
  };
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

  /**
   * Called when user pressed cancel button.
   *
   * If this is not provided, the cancel button will not be shown.
   */
  onCancel?: () => void;
  /**
   * Label for the cancel button.
   * @default "Cancel"
   */
  cancelLabel?: string;
};

function BaseCommentForm({
  autoFocus,
  disabled,
  defaultContent,
  onSubmitSuccess,
  onSubmit,
  placeholder = "What are your thoughts?",
  submitIdleLabel = "Comment",
  submitPendingLabel = "Please check your wallet to sign",
  onCancel,
  cancelLabel = "Cancel",
}: BaseCommentFormProps) {
  const { address } = useAccount();
  const connectAccount = useConnectAccount();

  const editorRef = useRef<EditorRef>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const onSubmitRef = useFreshRef(onSubmit);
  const onSubmitSuccessRef = useFreshRef(onSubmitSuccess);
  const suggestions = useIndexerSuggestions({
    indexerApiUrl: publicEnv.NEXT_PUBLIC_COMMENTS_INDEXER_URL,
  });
  const uploads = usePinataUploadFiles({
    allowedMimeTypes: ALLOWED_UPLOAD_MIME_TYPES,
    maxFileSize: MAX_UPLOAD_FILE_SIZE,
    pinataGatewayUrl: publicEnv.NEXT_PUBLIC_PINATA_GATEWAY_URL,
    generateUploadUrl: async (filename) => {
      const response = await fetch("/api/generate-upload-url", {
        method: "POST",
        body: JSON.stringify({ filename }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate upload URL");
      }

      const { url } = GenerateUploadUrlResponseSchema.parse(
        await response.json(),
      );

      return url;
    },
  });

  const submitMutation = useMutation({
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    mutationFn: async (formData: FormData): Promise<void> => {
      try {
        const author = await connectAccount();

        if (!editorRef.current?.editor) {
          throw new Error("Editor is not initialized");
        }

        const filesToUpload = editorRef.current?.getFilesForUpload() || [];

        await uploads.uploadFiles(filesToUpload, {
          onSuccess(uploadedFile) {
            editorRef.current?.setFileAsUploaded(uploadedFile);
          },
          onError(fileId) {
            editorRef.current?.setFileUploadAsFailed(fileId);
          },
        });

        const references = extractReferences(
          editorRef.current.editor.getJSON(),
        );

        // validate content
        const content = z
          .string()
          .trim()
          .max(MAX_COMMENT_LENGTH)
          .parse(
            editorRef.current.editor.getText({
              blockSeparator: "\n",
            }),
          );

        const result = await onSubmitRef.current?.({
          author,
          content,
          references,
        });

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
      editorRef.current?.clear();
      submitMutation.reset();
      onSubmitSuccessRef.current?.();
    },
    onError(error) {
      if (error instanceof InvalidCommentError) {
        editorRef.current?.focus();
      }
    },
  });

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      let files = Array.from(event.target.files || []);

      if (files.length === 0) {
        return;
      }

      let removedDueToMimeType = 0;
      let removedDueToSize = 0;

      files = files.filter((file) => {
        if (!ALLOWED_UPLOAD_MIME_TYPES.includes(file.type)) {
          removedDueToMimeType++;

          return false;
        }

        if (file.size > MAX_UPLOAD_FILE_SIZE) {
          removedDueToSize++;

          return false;
        }

        return true;
      });

      if (removedDueToMimeType > 0 || removedDueToSize) {
        toast.error("Some files were removed", {
          description: "Some files were removed due to file type or size",
        });
      }

      if (files.length === 0) {
        return;
      }

      editorRef.current?.addFiles(files);

      // Reset the input so the same file can be selected again
      event.target.value = "";
    },
    [],
  );

  const handleAddFileClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const isSubmitting = submitMutation.isPending;

  const ButtonWrapper = publicEnv.NEXT_PUBLIC_GASLESS_ENABLED
    ? GaslessIndicator
    : React.Fragment;

  return (
    <form
      action={async (formData) => {
        try {
          await submitMutation.mutateAsync(formData);
        } catch (e) {
          console.error(e);

          // do not rethrow the error, we already handle it in the mutations
        }
      }}
      className="flex flex-col gap-2 mb-2"
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ALLOWED_UPLOAD_MIME_TYPES.join(",")}
        onChange={handleFileSelect}
        className="hidden"
      />
      <Editor
        autoFocus={autoFocus}
        className={cn(
          "w-[calc(100%-2px)] p-2 border border-gray-300 rounded text-foreground mx-[1px]",
          disabled && "opacity-50",
          submitMutation.error &&
            submitMutation.error instanceof InvalidCommentError &&
            "border-destructive focus-visible:border-destructive",
        )}
        disabled={isSubmitting || disabled}
        placeholder={placeholder}
        defaultValue={defaultContent}
        ref={editorRef}
        suggestions={suggestions}
        suggestionsTheme={suggestionsTheme}
        uploads={uploads}
        onEscapePress={() => {
          if (isSubmitting) {
            return;
          }

          onCancel?.();
        }}
      />
      <div className="flex gap-2 justify-between text-xs">
        {address && (
          <>
            <CommentFormAuthor address={address} />
            {publicEnv.NEXT_PUBLIC_GASLESS_ENABLED && (
              <GaslessIndicator enableTooltipOnClick />
            )}
          </>
        )}
        <div className="flex gap-2 items-center ml-auto">
          <ApprovalSwitch />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  className="w-8 h-8"
                  aria-label="Add media"
                  variant="outline"
                  size="icon"
                  type="button"
                  onClick={handleAddFileClick}
                  disabled={isSubmitting || disabled}
                >
                  <ImageIcon className="stroke-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Add media</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <ButtonWrapper>
            <Button type="submit" disabled={isSubmitting || disabled} size="sm">
              {isSubmitting ? submitPendingLabel : submitIdleLabel}
            </Button>
          </ButtonWrapper>
          {onCancel && (
            <Button
              disabled={isSubmitting}
              onClick={onCancel}
              size="sm"
              type="button"
              variant="outline"
            >
              {cancelLabel}
            </Button>
          )}
        </div>
      </div>
      {submitMutation.error && (
        <CommentFormErrors
          className="text-destructive"
          error={submitMutation.error}
        />
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
  queryKey: QueryKey;
};

export function CommentForm({
  onSubmitStart,
  parentId,
  queryKey,
  ...props
}: CommentFormProps) {
  const wagmiConfig = useConfig();
  const commentSubmission = useCommentSubmission();
  const { switchChainAsync } = useSwitchChain();
  const { targetUri, chainId } =
    useEmbedConfig<EmbedConfigProviderByTargetURIConfig>();
  const onSubmitStartRef = useFreshRef(onSubmitStart);
  const { readContractAsync, writeContractAsync, signTypedDataAsync } =
    useReadWriteContractAsync();

  const submitCommentMutation = useCallback<OnSubmitFunction>(
    async ({ author, content, references }) => {
      const pendingOperation = await submitPostCommentMutationFunction({
        author: author,
        postCommentRequest: {
          chainId,
          content,
          ...(parentId ? { parentId } : { targetUri }),
        },
        references,
        switchChainAsync(chainId) {
          return switchChainAsync({ chainId });
        },
        readContractAsync,
        signTypedDataAsync,
        writeContractAsync: writeContractAsync,
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
      queryKey,
      readContractAsync,
      signTypedDataAsync,
      switchChainAsync,
      targetUri,
      wagmiConfig,
      writeContractAsync,
    ],
  );

  return <BaseCommentForm {...props} onSubmit={submitCommentMutation} />;
}

function CommentFormAuthor({ address }: { address: Hex }) {
  const { openAccountModal } = useAccountModal();
  const { openChainModal } = useChainModal();
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
      title={`Publishing as ${getCommentAuthorNameOrAddress(queryResult.data ?? { address })}${publicEnv.NEXT_PUBLIC_GASLESS_ENABLED ? " for free" : ""}`}
    >
      <CommentAuthorAvatar author={queryResult.data ?? { address }} />
      <div className="flex-grow text-xs text-muted-foreground truncate">
        {getCommentAuthorNameOrAddress(queryResult.data ?? { address })}
      </div>

      {address && !openAccountModal && openChainModal && (
        <button
          className="text-xs bg-destructive rounded-sm px-2"
          onClick={() => openChainModal()}
          type="button"
        >
          wrong network
        </button>
      )}
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

  const { readContractAsync, writeContractAsync, signTypedDataAsync } =
    useReadWriteContractAsync();

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
        readContractAsync,
        writeContractAsync,
        signTypedDataAsync,
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
      onSubmitStartRef,
      queryKey,
      readContractAsync,
      signTypedDataAsync,
      switchChainAsync,
      wagmiConfig,
      writeContractAsync,
    ],
  );

  return (
    <BaseCommentForm
      {...props}
      defaultContent={{
        content: comment.content,
        references: comment.references,
      }}
      onSubmit={submitCommentMutation}
      submitIdleLabel="Update"
      submitPendingLabel="Updating..."
    />
  );
}
