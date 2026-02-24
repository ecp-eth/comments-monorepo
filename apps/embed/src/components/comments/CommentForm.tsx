import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QueryKey, useMutation, useQuery } from "@tanstack/react-query";
import React, { useCallback, useMemo, useRef, useState } from "react";
import { useAccount } from "wagmi";
import { fetchAuthorData } from "@ecp.eth/sdk/indexer";
import { useConnectAccount, useFreshRef } from "@ecp.eth/shared/hooks";
import {
  EmbedConfigProviderByTargetURIConfig,
  useEmbedConfig,
} from "../EmbedConfigProvider";
import type { Hex } from "@ecp.eth/sdk/core/schemas";
import { cn } from "@/lib/utils";

import {
  ALLOWED_UPLOAD_MIME_TYPES,
  MAX_COMMENT_LENGTH,
  MAX_UPLOAD_FILE_SIZE,
} from "@/lib/constants";
import { CommentAuthorAvatar } from "./CommentAuthorAvatar";
import { getCommentAuthorNameOrAddress } from "@ecp.eth/shared/helpers";
import { useChannelFee } from "@ecp.eth/shared/hooks/useChannelFee";
import { useAccountModal, useChainModal } from "@rainbow-me/rainbowkit";
import { publicEnv } from "@/publicEnv";
import { CommentFormErrors } from "@ecp.eth/shared/components/CommentFormErrors";
import { InvalidCommentError } from "@ecp.eth/shared/errors";
import type { OnSubmitSuccessFunction } from "@ecp.eth/shared/types";
import type { Comment } from "@ecp.eth/shared/schemas";
import { z } from "zod";
import { Editor, type EditorRef } from "@ecp.eth/react-editor/editor";
import { defaultTheme } from "@ecp.eth/react-editor/default-theme";
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
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { ImageIcon, Ellipsis, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { suggestionsTheme } from "./editorTheme";
import { GaslessIndicator } from "./GaslessIndicator";
import { usePostComment } from "./hooks/usePostComment";
import { useEditComment } from "./hooks/useEditComment";
import { Label } from "@/components/ui/label";
import { createMetadataEntry, type MetadataType } from "@ecp.eth/sdk/comments";
import type { MetadataEntry as ECPMetadataEntry } from "@ecp.eth/sdk/comments/types";

interface FormMetadataEntry {
  key: string;
  value: string;
  type: MetadataType;
}

const METADATA_TYPE_OPTIONS: MetadataType[] = [
  "string",
  "uint256",
  "int256",
  "address",
  "bool",
  "bytes",
  "bytes32",
];

function parseChannelIdInput(value: string): bigint | undefined {
  const trimmed = value.trim();
  if (trimmed === "" || !/^\d+$/.test(trimmed)) return undefined;
  return BigInt(trimmed);
}

function convertFormMetadataToECP(
  entries: FormMetadataEntry[],
): ECPMetadataEntry[] {
  return entries
    .filter((entry) => entry.key.trim() && entry.value.trim())
    .map((entry) => createMetadataEntry(entry.key, entry.type, entry.value));
}

type OnSubmitFunction = (params: {
  author: Hex;
  content: string;
  references: IndexerAPICommentReferencesSchemaType;
  metadata: ECPMetadataEntry[];
  targetUriOverride?: string;
  channelIdOverride?: bigint;
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
  isEdit: boolean;
} & ({ parentId: Hex } | { targetUri: string });

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
  isEdit,
  ...targetUriOrParentIdContainer
}: BaseCommentFormProps) {
  const { address } = useAccount();
  const config = useEmbedConfig();
  const connectAccount = useConnectAccount();
  const editorRef = useRef<EditorRef>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const onSubmitRef = useFreshRef(onSubmit);
  const onSubmitSuccessRef = useFreshRef(onSubmitSuccess);
  const [metadata, setMetadata] = useState<FormMetadataEntry[]>([]);
  const hasTargetUri = "targetUri" in targetUriOrParentIdContainer;
  const [targetUriOverride, setTargetUriOverride] = useState("");
  const [channelIdInput, setChannelIdInput] = useState(
    config.channelId != null ? config.channelId.toString() : "",
  );

  const isDuplicateKey = (key: string, currentIndex: number) => {
    if (!key.trim()) return false;
    return metadata.some(
      (entry, index) =>
        index !== currentIndex && entry.key.trim() === key.trim(),
    );
  };
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
  const [content, setContent] = useState("");
  const parsedChannelId = parseChannelIdInput(channelIdInput);

  const {
    data: {
      fee,
      nativeTokenCostInEthText,
      nativeTokenCostInUSDText,
      erc20CostText,
    } = {},
  } = useChannelFee({
    action: isEdit ? "edit" : "post",
    channelId: parsedChannelId ?? config.channelId,
    address,
    content,
    app:
      config.app === "embed" || config.app === "all"
        ? publicEnv.NEXT_PUBLIC_APP_SIGNER_ADDRESS
        : config.app,
    ...targetUriOrParentIdContainer,
  });

  const submitMutation = useMutation({
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    mutationFn: async (formData: FormData): Promise<void> => {
      try {
        const author = await connectAccount();

        if (!editorRef.current?.editor) {
          throw new Error("Editor is not initialized");
        }

        const filesToUpload = await (editorRef.current?.getFilesForUpload() ||
          []);

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

        const ecpMetadata = convertFormMetadataToECP(metadata);

        const result = await onSubmitRef.current?.({
          author,
          content,
          references,
          metadata: ecpMetadata,
          targetUriOverride: targetUriOverride.trim() || undefined,
          channelIdOverride: parsedChannelId,
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
      setMetadata([]);
      setTargetUriOverride("");
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

  const editorTheme = useMemo(() => {
    return {
      editor: {
        className: cn(
          "flex flex-col min-h-[80px] w-full bg-transparent px-3 pt-2 pb-1 text-base placeholder:text-muted-foreground focus-visible:outline-none md:text-sm",
          submitMutation.error &&
            submitMutation.error instanceof InvalidCommentError &&
            "ring-1 ring-destructive",
        ),
      },
      editor_disabled: {
        className: cn(defaultTheme.editor_disabled.className, "opacity-50"),
      },
    };
  }, [submitMutation.error]);

  const handleAddFileClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);
  const isSubmitting = submitMutation.isPending;
  const ButtonWrapper =
    config.gasSponsorship !== "not-gasless" ? GaslessIndicator : React.Fragment;

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
      <div className="border border-border rounded-lg bg-background overflow-hidden">
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
          disabled={isSubmitting || disabled}
          placeholder={placeholder}
          defaultValue={defaultContent}
          ref={editorRef}
          suggestions={suggestions}
          suggestionsTheme={suggestionsTheme}
          uploads={uploads}
          onUpdate={() => {
            setContent(
              editorRef.current?.editor?.getText({
                blockSeparator: "\n",
              }) ?? "",
            );
          }}
          onEscapePress={() => {
            if (isSubmitting) {
              return;
            }

            onCancel?.();
          }}
          theme={editorTheme}
        />
        <div className="flex gap-2 justify-between items-center text-xs px-3 pb-2">
          {address && <CommentFormAuthor address={address} />}
          <div className="flex gap-2 items-center ml-auto">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    className="w-8 h-8"
                    aria-label="Add media"
                    variant="ghost"
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
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  className="w-8 h-8"
                  aria-label="More options"
                  variant="ghost"
                  size="icon"
                  type="button"
                  disabled={isSubmitting || disabled}
                >
                  <Ellipsis className="stroke-foreground h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="end">
                <div className="space-y-4">
                  {hasTargetUri && (
                    <div className="space-y-1.5">
                      <h4 className="font-medium text-sm">Target</h4>
                      <Input
                        placeholder="https://example.com"
                        value={targetUriOverride}
                        onChange={(e) => setTargetUriOverride(e.target.value)}
                        className="h-7 text-xs"
                      />
                      <p className="text-xs text-muted-foreground">
                        The URL this comment is about.
                      </p>
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <h4 className="font-medium text-sm">Channel</h4>
                    <Input
                      placeholder="Channel ID (e.g. 0)"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={channelIdInput}
                      onChange={(e) => {
                        const value = e.target.value.trim();
                        if (value === "" || /^\d+$/.test(value)) {
                          setChannelIdInput(value);
                        }
                      }}
                      className="h-7 text-xs"
                    />
                    <p className="text-xs text-muted-foreground">
                      The channel to post this comment to.
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">Metadata</h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setMetadata([
                          ...metadata,
                          { key: "", value: "", type: "string" },
                        ]);
                      }}
                      className="h-7 px-2 text-xs"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add
                    </Button>
                  </div>
                  {metadata.length > 0 && (
                    <div className="space-y-2">
                      {metadata.map((entry, index) => (
                        <div key={index} className="space-y-1.5">
                          <div className="flex gap-1.5 items-center">
                            <Input
                              placeholder="Key"
                              value={entry.key}
                              onChange={(e) => {
                                const updated = [...metadata];
                                updated[index] = {
                                  ...updated[index],
                                  key: e.target.value,
                                };
                                setMetadata(updated);
                              }}
                              className={cn(
                                "h-7 text-xs flex-1",
                                isDuplicateKey(entry.key, index) &&
                                  "border-destructive",
                              )}
                            />
                            <select
                              value={entry.type}
                              onChange={(e) => {
                                const updated = [...metadata];
                                updated[index] = {
                                  ...updated[index],
                                  type: e.target.value as MetadataType,
                                };
                                setMetadata(updated);
                              }}
                              className="h-7 rounded-md border border-border bg-transparent text-foreground px-1.5 text-xs appearance-none cursor-pointer"
                            >
                              {METADATA_TYPE_OPTIONS.map((type) => (
                                <option key={type} value={type}>
                                  {type}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              className="h-7 w-7 shrink-0 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive transition-colors"
                              onClick={() => {
                                setMetadata(
                                  metadata.filter((_, i) => i !== index),
                                );
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <Input
                            placeholder="Value"
                            value={entry.value}
                            onChange={(e) => {
                              const updated = [...metadata];
                              updated[index] = {
                                ...updated[index],
                                value: e.target.value,
                              };
                              setMetadata(updated);
                            }}
                            className="h-7 text-xs"
                          />
                          {isDuplicateKey(entry.key, index) && (
                            <p className="text-xs text-destructive">
                              Duplicate key
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {metadata.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      Add key-value pairs with Solidity types.
                    </p>
                  )}
                </div>
              </PopoverContent>
            </Popover>
            {fee &&
            config.gasSponsorship !== "not-gasless" &&
            fee.baseToken.amount === 0n &&
            !erc20CostText ? (
              <Label
                className="h-8 text-[0.8em] flex flex-row items-center gap-2"
                aria-label="Cost of posting"
              >
                Free
              </Label>
            ) : (
              (nativeTokenCostInEthText || erc20CostText) && (
                <Label
                  className="h-8 text-[0.8em] flex flex-row items-center gap-2"
                  aria-label="Cost of posting"
                >
                  {[
                    nativeTokenCostInEthText +
                      (nativeTokenCostInUSDText
                        ? ` (≈ ${nativeTokenCostInUSDText})`
                        : ""),
                    erc20CostText,
                  ]
                    .filter(Boolean)
                    .join(" and ")}
                </Label>
              )
            )}
            <ButtonWrapper>
              <Button
                type="submit"
                disabled={isSubmitting || disabled}
                size="sm"
              >
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

type CommentFormProps = Omit<BaseCommentFormProps, "onSubmit" | "isEdit"> & {
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
  const { targetUri } = useEmbedConfig<EmbedConfigProviderByTargetURIConfig>();
  const onSubmitStartRef = useFreshRef(onSubmitStart);
  const submitCommentMutation = usePostComment();

  return (
    <BaseCommentForm
      {...props}
      {...(parentId ? { parentId } : { targetUri })}
      isEdit={false}
      onSubmit={({
        author,
        content,
        references,
        metadata,
        targetUriOverride,
        channelIdOverride,
      }) =>
        submitCommentMutation({
          queryKey,
          onSubmitStart: onSubmitStartRef.current,
          author,
          content,
          references,
          metadata,
          channelIdOverride,
          targetUriOrParentId: parentId
            ? { parentId }
            : { targetUri: targetUriOverride || targetUri },
        })
      }
    />
  );
}

function CommentFormAuthor({ address }: { address: Hex }) {
  const embedConfig = useEmbedConfig();
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

  const authorName = getCommentAuthorNameOrAddress(
    queryResult.data ?? { address },
  );

  return (
    <div
      className="flex flex-row gap-2 items-center overflow-hidden"
      title={`Publishing as ${authorName}${embedConfig.gasSponsorship === "not-gasless" ? "" : " for free"}`}
    >
      {openAccountModal ? (
        <button
          className="flex flex-row gap-2 items-center overflow-hidden cursor-pointer"
          onClick={() => openAccountModal()}
          type="button"
        >
          <CommentAuthorAvatar author={queryResult.data ?? { address }} />
          <div className="flex-grow text-xs text-muted-foreground truncate">
            {authorName}
          </div>
        </button>
      ) : (
        <>
          <CommentAuthorAvatar author={queryResult.data ?? { address }} />
          <div className="flex-grow text-xs text-muted-foreground truncate">
            {authorName}
          </div>
        </>
      )}

      {address && !openAccountModal && openChainModal && (
        <button
          className="text-xs bg-destructive rounded-sm px-2"
          onClick={() => openChainModal()}
          type="button"
        >
          wrong network
        </button>
      )}
    </div>
  );
}

type CommentEditFormProps = Omit<
  BaseCommentFormProps,
  "defaultContent" | "onSubmit" | "isEdit"
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
  const onSubmitStartRef = useFreshRef(onSubmitStart);
  const submitCommentMutation = useEditComment();
  const { parentId, targetUri } = comment;

  return (
    <BaseCommentForm
      {...props}
      {...(parentId ? { parentId } : { targetUri })}
      isEdit={true}
      defaultContent={{
        content: comment.content,
        references: comment.references,
      }}
      onSubmit={({ author, content, references }) => {
        return submitCommentMutation({
          queryKey,
          onSubmitStart: onSubmitStartRef.current,
          author,
          content,
          references,
          comment,
        });
      }}
      submitIdleLabel="Update"
      submitPendingLabel="Updating..."
    />
  );
}
