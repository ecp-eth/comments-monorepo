"use client";

import React, { useCallback, useRef } from "react";

import { Button } from "@/components/ui/button";
import { ImageIcon, Loader2Icon, SendIcon } from "lucide-react";
import {
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
import { useMutation } from "@tanstack/react-query";
import { publicEnv } from "@/env/public";
import {
  GenerateUploadUrlResponseSchema,
  SignCommentPayloadRequestSchema,
  SignCommentResponseServerSchema,
} from "@/api/schemas";
import { postComment } from "@ecp.eth/sdk/comments";
import { toast } from "sonner";
import z from "zod";
import { useChainId, useConfig, useWriteContract } from "wagmi";
import { waitForTransactionReceipt } from "@wagmi/core";
import type { IndexerAPICommentSchemaType } from "@ecp.eth/sdk/indexer";
import { getChannelCaipUri } from "@/lib/utils";

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
}: EditorComposerProps) {
  const wagmiConfig = useConfig();
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
          .parse(
            editorRef.current.editor.getText({
              blockSeparator: "\n",
            }),
          );

        const parseResult = SignCommentPayloadRequestSchema.safeParse({
          content,
          references,
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

        const signCommentResponse = await fetch("/api/sign-comment", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(commentData),
        });

        if (!signCommentResponse.ok) {
          await throwKnownResponseCodeError(signCommentResponse);

          throw new Error(
            "Failed to obtain signed comment data, please try again.",
          );
        }

        const signCommentResult = SignCommentResponseServerSchema.safeParse(
          await signCommentResponse.json(),
        );

        if (!signCommentResult.success) {
          throw new Error(
            "Server returned malformed signed comment data, please try again.",
          );
        }

        const { txHash } = await postComment({
          appSignature: signCommentResult.data.signature,
          comment: signCommentResult.data.data,
          writeContract: writeContractAsync,
        });

        const receipt = await waitForTransactionReceipt(wagmiConfig, {
          hash: txHash,
        });

        if (receipt.status !== "success") {
          throw new Error("Failed to post comment");
        }
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

      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={submitMutation.isPending}
          onClick={handleAddFileClick}
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
