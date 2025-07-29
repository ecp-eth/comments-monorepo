"use client";

import React, { useCallback, useRef } from "react";

import { Button } from "@/components/ui/button";
import { ImageIcon, Loader2Icon, SendIcon } from "lucide-react";
import {
  CommentFormSubmitError,
  InvalidCommentError,
  throwKnownResponseCodeError,
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
import {
  GenerateUploadUrlResponseSchema,
  SignCommentPayloadRequestClientSchema,
  SignCommentResponseServerSchema,
} from "@/api/schemas";
import { postComment } from "@ecp.eth/sdk/comments";
import { toast } from "sonner";
import z from "zod";
import { useAccount, useChainId, useConfig, useWriteContract } from "wagmi";
import { waitForTransactionReceipt } from "@wagmi/core";
import {
  fetchAuthorData,
  type IndexerAPICommentSchemaType,
} from "@ecp.eth/sdk/indexer";
import { getChannelCaipUri } from "@/lib/utils";
import { useCommentSubmission } from "@ecp.eth/shared/hooks";
import { SubmitCommentMutationError } from "@/errors";
import type { PendingPostCommentOperationSchemaType } from "@ecp.eth/shared/schemas";
import { SUPPORTED_CHAINS } from "@ecp.eth/sdk";
import { base } from "viem/chains";
import { sdk } from "@farcaster/miniapp-sdk";

interface EditorComposerProps {
  /**
   * @default false
   */
  autoFocus?: boolean;
  onCancel?: () => void;
  onSubmitSuccess?: () => void;
  placeholder?: string;
  submitLabel?: string;
  submittingLabel?: string;
  channelId: bigint;
  replyingTo?: IndexerAPICommentSchemaType;
  queryKey: QueryKey;
}

export function EditorComposer({
  autoFocus = false,
  onCancel,
  placeholder = "What's on your mind?",
  submitLabel = "Post",
  submittingLabel = "Posting...",
  onSubmitSuccess,
  channelId,
  replyingTo,
  queryKey,
}: EditorComposerProps) {
  const { address } = useAccount();
  const wagmiConfig = useConfig();
  const commentSubmission = useCommentSubmission();
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

        const parseResult = SignCommentPayloadRequestClientSchema.safeParse({
          author: address,
          channelId,
          content,
          references,
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

        if (!parseResult.success) {
          throw new InvalidCommentError(
            parseResult.error.flatten().fieldErrors,
          );
        }

        const commentData = parseResult.data;

        const signCommentResponse = await sdk.quickAuth.fetch(
          "/api/sign-comment",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(commentData),
          },
        );

        if (!signCommentResponse.ok) {
          await throwKnownResponseCodeError(signCommentResponse);

          throw new SubmitCommentMutationError(
            "Failed to obtain signed comment data, please try again.",
          );
        }

        const signCommentResult = SignCommentResponseServerSchema.safeParse(
          await signCommentResponse.json(),
        );

        if (!signCommentResult.success) {
          throw new SubmitCommentMutationError(
            "Server returned malformed signed comment data, please try again.",
          );
        }

        const { txHash } = await postComment({
          commentsAddress: SUPPORTED_CHAINS[base.id].commentManagerAddress,
          appSignature: signCommentResult.data.signature,
          comment: signCommentResult.data.data,
          writeContract: writeContractAsync,
        });

        const pendingOperation: PendingPostCommentOperationSchemaType = {
          action: "post",
          type: "non-gasless",
          txHash,
          chainId,
          references,
          response: signCommentResult.data,
          state: {
            status: "pending",
          },
          resolvedAuthor,
        };

        commentSubmission.start({
          pendingOperation,
          queryKey,
        });

        try {
          const receipt = await waitForTransactionReceipt(wagmiConfig, {
            hash: txHash,
          });

          if (receipt.status !== "success") {
            throw new SubmitCommentMutationError(
              "Failed to post comment, transaction reverted.",
            );
          }

          commentSubmission.success({
            queryKey,
            pendingOperation,
          });
        } catch (receiptError) {
          commentSubmission.error({
            queryKey,
            commentId: pendingOperation.response.data.id,
            error:
              receiptError instanceof Error
                ? receiptError
                : new Error(String(receiptError)),
          });

          throw receiptError;
        }
      } catch (e) {
        if (e instanceof z.ZodError) {
          throw new InvalidCommentError(
            e.flatten().fieldErrors as Record<string, string[]>,
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
        <div className="text-red-500 text-xs">
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
          ) : (
            <SendIcon className="h-4 w-4" />
          )}
          {submitMutation.isPending ? submittingLabel : submitLabel}
        </Button>
      </div>
    </form>
  );
}
