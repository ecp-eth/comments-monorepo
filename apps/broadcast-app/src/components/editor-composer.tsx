"use client";

import React, { useCallback, useMemo, useRef } from "react";

import { Button } from "@/components/ui/button";
import { ImageIcon, Loader2Icon, SaveIcon, SendIcon } from "lucide-react";
import {
  CommentFormSubmitError,
  InvalidCommentError,
} from "@ecp.eth/shared/errors";
import { Editor, type EditorRef } from "@ecp.eth/react-editor/editor";
import {
  ALLOWED_UPLOAD_MIME_TYPES,
  MAX_UPLOAD_FILE_SIZE,
} from "@ecp.eth/react-editor";
import {
  useIndexerSuggestions,
  usePinataUploadFiles,
} from "@ecp.eth/react-editor/hooks";
import { extractReferences } from "@ecp.eth/react-editor/extract-references";
import { type QueryKey, useMutation } from "@tanstack/react-query";
import { publicEnv } from "@/env/public";
import { GenerateUploadUrlResponseSchema } from "@/api/schemas";
import { editComment, postComment } from "@ecp.eth/sdk/comments";
import { toast } from "sonner";
import z from "zod";
import {
  useAccount,
  useChainId,
  useWriteContract,
  usePublicClient,
} from "wagmi";
import {
  fetchAuthorData,
  type IndexerAPICommentSchemaType,
} from "@ecp.eth/sdk/indexer";
import { getChannelCaipUri } from "@/lib/utils";
import { useCommentEdition, useCommentSubmission } from "@ecp.eth/shared/hooks";
import { SignCommentError, SubmitCommentMutationError } from "@/errors";
import type {
  Comment,
  PendingEditCommentOperationSchemaType,
  PendingPostCommentOperationSchemaType,
} from "@ecp.eth/shared/schemas";
import { signCommentOrReaction } from "@/api/sign-comment-or-reaction";
import { formatContractFunctionExecutionError } from "@ecp.eth/shared/helpers";
import { ContractFunctionExecutionError } from "viem";
import { signEditComment } from "@/api/sign-edit-comment";
import { COMMENT_MANAGER_ADDRESS } from "@/wagmi/client";

interface EditorComposerProps {
  /**
   * @default false
   */
  autoFocus?: boolean;
  /**
   * The comment to edit.
   *
   * If provided, the editor will be pre-filled with the comment content.
   *
   * If not provided, the editor will be used to create a new comment.
   */
  comment?: Comment;
  onCancel?: () => void;
  onSubmitStart?: () => void;
  onSubmitSuccess?: () => void;
  placeholder?: string;
  submitLabel?: string;
  /**
   * The icon to use for the submit button.
   *
   * @default 'send'
   */
  submitIcon?: "send" | "save";
  submittingLabel?: string;
  channelId: bigint;
  replyingTo?: IndexerAPICommentSchemaType;
  queryKey: QueryKey;
}

export function EditorComposer({
  autoFocus = false,
  comment,
  onCancel,
  placeholder = "What's on your mind?",
  submitLabel = "Post",
  submittingLabel = "Posting...",
  submitIcon = "send",
  onSubmitSuccess,
  channelId,
  replyingTo,
  queryKey,
}: EditorComposerProps) {
  const defaultValue = useMemo(() => {
    if (!comment) {
      return undefined;
    }

    return {
      content: comment.content,
      references: comment.references,
    };
  }, [comment]);

  const { address } = useAccount();
  const publicClient = usePublicClient();
  const commentSubmission = useCommentSubmission();
  const commentEdition = useCommentEdition();
  const { writeContractAsync } = useWriteContract();
  const chainId = useChainId();
  const suggestions = useIndexerSuggestions();
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
  const editorRef = useRef<EditorRef>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const submitMutation = useMutation({
    mutationFn: async (): Promise<void> => {
      try {
        if (!editorRef.current?.editor) {
          throw new SubmitCommentMutationError("Editor is not initialized");
        }

        if (!address) {
          throw new SubmitCommentMutationError("Wallet not connected");
        }

        if (!publicClient) {
          throw new SubmitCommentMutationError("Public client not initialized");
        }

        const resolvedAuthor = await fetchAuthorData({
          address,
          apiUrl: publicEnv.NEXT_PUBLIC_INDEXER_URL,
        }).catch((e) => {
          // supress the error, we don't want to block the comment submission
          console.error(e);

          return undefined;
        });

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
          .parse(
            editorRef.current.editor.getText({
              blockSeparator: "\n",
            }),
          );

        if (comment) {
          const signedCommentResponse = await signEditComment({
            author: address,
            commentId: comment.id,
            content,
            metadata: comment.metadata,
          });

          const { txHash, wait } = await editComment({
            appSignature: signedCommentResponse.signature,
            edit: signedCommentResponse.data,
            writeContract: writeContractAsync,
            commentsAddress: COMMENT_MANAGER_ADDRESS,
          });

          await wait({
            getContractEvents: publicClient.getContractEvents,
            waitForTransactionReceipt: publicClient.waitForTransactionReceipt,
          });

          const pendingOperation: PendingEditCommentOperationSchemaType = {
            action: "edit",
            chainId: comment.chainId,
            response: signedCommentResponse,
            state: {
              status: "pending",
            },
            txHash,
            type: "non-gasless",
          };

          commentEdition.start({
            queryKey,
            pendingOperation,
          });

          commentEdition.success({
            queryKey,
            pendingOperation,
          });
        } else {
          const signedCommentResponse = await signCommentOrReaction({
            author: address,
            channelId,
            content,
            metadata: [],
            ...(replyingTo
              ? { parentId: replyingTo.id }
              : {
                  targetUri: getChannelCaipUri({
                    chainId,
                    channelId,
                  }),
                }),
          });

          const { txHash, wait } = await postComment({
            commentsAddress: COMMENT_MANAGER_ADDRESS,
            appSignature: signedCommentResponse.signature,
            comment: signedCommentResponse.data,
            writeContract: writeContractAsync,
          });

          const postedComment = await wait({
            getContractEvents: publicClient.getContractEvents,
            waitForTransactionReceipt: publicClient.waitForTransactionReceipt,
          });

          const pendingOperation: PendingPostCommentOperationSchemaType = {
            action: "post",
            type: "non-gasless",
            txHash,
            chainId,
            references,
            response: {
              data: postedComment
                ? {
                    id: postedComment.commentId,
                    app: postedComment.app,
                    author: postedComment.author,
                    channelId: postedComment.channelId,
                    content: postedComment.content,
                    commentType: postedComment.commentType,
                    deadline: signedCommentResponse.data.deadline,
                    metadata: postedComment.metadata.slice(),
                    parentId: postedComment.parentId,
                    targetUri: postedComment.targetUri,
                  }
                : signedCommentResponse.data,
              signature: signedCommentResponse.signature,
              hash: signedCommentResponse.hash,
            },
            state: {
              status: "pending",
            },
            resolvedAuthor,
          };

          // insert
          commentSubmission.start({
            pendingOperation,
            queryKey,
          });

          // mark as posted
          commentSubmission.success({
            queryKey,
            pendingOperation,
          });
        }
      } catch (e) {
        if (e instanceof z.ZodError) {
          throw new InvalidCommentError(
            e.flatten().fieldErrors as Record<string, string[]>,
          );
        } else if (e instanceof SignCommentError) {
          throw new SubmitCommentMutationError(e.message);
        } else if (e instanceof ContractFunctionExecutionError) {
          throw new SubmitCommentMutationError(
            formatContractFunctionExecutionError(e),
          );
        }

        console.error(e);

        throw e;
      }
    },
    onSuccess() {
      editorRef.current?.clear();
      submitMutation.reset();
      onSubmitSuccess?.();
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

      if (removedDueToMimeType > 0 || removedDueToSize > 0) {
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

  return (
    <form
      className="space-y-3"
      action={async () => {
        try {
          await submitMutation.mutateAsync();
        } catch {
          // empty, handled by useMutation
        }
      }}
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
        defaultValue={defaultValue}
        ref={editorRef}
        disabled={submitMutation.isPending}
        placeholder={placeholder}
        suggestions={suggestions}
        uploads={uploads}
        onEscapePress={() => {
          if (submitMutation.isPending) {
            return;
          }

          onCancel?.();
        }}
      />

      {submitMutation.error && (
        <div className="text-red-500 text-xs flex flex-col gap-1">
          {submitMutation.error instanceof CommentFormSubmitError
            ? submitMutation.error.render()
            : submitMutation.error.message}
        </div>
      )}

      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={submitMutation.isPending}
          onClick={handleAddFileClick}
          type="button"
        >
          <ImageIcon className="h-4 w-4" />
        </Button>

        <Button
          className="gap-2"
          disabled={submitMutation.isPending}
          size="sm"
          type="submit"
        >
          {submitMutation.isPending ? (
            <Loader2Icon className="h-4 w-4 animate-spin" />
          ) : submitIcon === "send" ? (
            <SendIcon className="h-4 w-4" />
          ) : (
            <SaveIcon className="h-4 w-4" />
          )}
          {submitMutation.isPending ? submittingLabel : submitLabel}
        </Button>
      </div>
    </form>
  );
}
