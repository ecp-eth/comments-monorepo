import { useMutation } from "@tanstack/react-query";
import { useCallback, useRef, useState } from "react";
import { useAccount } from "wagmi";
import { CommentBoxAuthor } from "./CommentBoxAuthor";
import { z } from "zod";
import { InvalidCommentError } from "./errors";
import { CommentFormErrors } from "./CommentFormErrors";
import { useConnectAccount, useFreshRef } from "@ecp.eth/shared/hooks";
import { useCommentActions } from "./CommentActionsContext";
import type { QueryKey } from "@tanstack/react-query";
import type { Hex } from "viem";
import { Button } from "@/components/ui/button";
import type { OnSubmitSuccessFunction } from "@ecp.eth/shared/types";
import {
  createCommentRepliesQueryKey,
  createRootCommentsQueryKey,
} from "./queries";
import type { Comment } from "@ecp.eth/shared/schemas";
import { Editor, EditorRef } from "./CommentTextEditor/Editor";
import { useUploadFiles } from "./CommentTextEditor/hooks/useUploadFiles";
import type { IndexerAPICommentReferencesSchemaType } from "@ecp.eth/sdk/indexer";
import { isContentEqual } from "./CommentTextEditor/utils";

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
  /**
   * Default comment content, will be parsed as markdown.
   */
  defaultContent?: {
    content: string;
    references: IndexerAPICommentReferencesSchemaType;
  };
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
  autoFocus = false,
  defaultContent,
  disabled = false,
  onCancel,
  onSubmit,
  placeholder = "What are your thoughts?",
  submitIdleLabel = "Post",
  submitPendingLabel = "Posting...",
  onSubmitSuccess,
}: BaseCommentFormProps) {
  const [formState, setFormState] = useState<"idle" | "post">("idle");
  const { address } = useAccount();
  const connectAccount = useConnectAccount();
  const editorRef = useRef<EditorRef>(null);
  const onSubmitSuccessRef = useFreshRef(onSubmitSuccess);
  const { uploadFiles } = useUploadFiles();

  const submitMutation = useMutation({
    mutationFn: async (formData: FormData): Promise<void> => {
      try {
        const author = await connectAccount();
        const submitAction = formData.get("action") as "post";

        setFormState(submitAction);

        if (!editorRef.current?.editor) {
          throw new Error("Editor is not initialized");
        }

        const filesToUpload = editorRef.current?.getFilesForUpload() || [];

        await uploadFiles(filesToUpload, {
          onSuccess(uploadedFile) {
            editorRef.current?.setFileAsUploaded(uploadedFile);
          },
          onError(fileId) {
            editorRef.current?.setFileUploadAsFailed(fileId);
          },
        });

        // validate content
        const content = z
          .string()
          .trim()
          .parse(
            editorRef.current.editor.getText({
              blockSeparator: "\n",
            }),
          );

        const result = await onSubmit({ author, content });

        return result;
      } catch (e) {
        if (e instanceof z.ZodError) {
          throw new InvalidCommentError(
            e.flatten().fieldErrors as Record<string, string[]>,
          );
        }

        throw e;
      } finally {
        setFormState("idle");
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

  const isSubmitting = submitMutation.isPending;

  return (
    <form
      action={async (formData: FormData) => {
        try {
          await submitMutation.mutateAsync(formData);
        } catch {
          /* empty - handled by useMutation */
        }
      }}
      className="mb-4 flex flex-col gap-2"
    >
      <Editor
        autoFocus={autoFocus}
        onBlur={() => {
          if (isSubmitting) {
            return;
          }

          const editor = editorRef.current;

          if (!editor) {
            return;
          }

          const isEmpty = editor.editor?.isEmpty ?? true;
          const defaultContent = editor.getDefaultContent();
          const currentContent = editor.editor?.getJSON();

          if (
            isEmpty ||
            isContentEqual(currentContent ?? {}, defaultContent ?? {})
          ) {
            onCancel?.();
          }
        }}
        className="w-full p-2 border border-gray-300 rounded"
        disabled={isSubmitting || disabled}
        placeholder={placeholder}
        defaultValue={defaultContent}
        ref={editorRef}
        onEscapePress={() => {
          if (isSubmitting) {
            return;
          }

          onCancel?.();
        }}
      />
      <div className="flex gap-2 justify-between">
        {address && <CommentBoxAuthor address={address} />}
        <div className="flex gap-2 items-center ml-auto">
          <Button
            name="action"
            value="post"
            type="submit"
            className="px-4 py-2 rounded"
            disabled={isSubmitting}
          >
            {formState === "post" ? submitPendingLabel : submitIdleLabel}
          </Button>
        </div>
      </div>
      {submitMutation.error && (
        <CommentFormErrors error={submitMutation.error} />
      )}
    </form>
  );
}

export type CommentFormProps<TExtraSubmitData = unknown> = Omit<
  BaseCommentFormProps,
  "onSubmit"
> & {
  /**
   * Called when transaction was created but not yet processed.
   */
  onSubmitStart?: () => void;
  /**
   * Extra data to be passed to post comment
   */
  extra?: TExtraSubmitData;
  parentId?: Hex;
};

export function CommentForm<TExtraSubmitData = unknown>({
  parentId,
  onSubmitStart,
  extra,
  ...props
}: CommentFormProps<TExtraSubmitData>) {
  const { postComment } = useCommentActions<TExtraSubmitData>();
  const onSubmitStartRef = useFreshRef(onSubmitStart);

  const handleSubmit = useCallback<OnSubmitFunction>(
    async ({ author, content }) => {
      let queryKey: QueryKey;

      if (parentId) {
        queryKey = createCommentRepliesQueryKey(author, parentId);
      } else {
        queryKey = createRootCommentsQueryKey(author, window.location.href);
      }

      const result = await postComment({
        address: author,
        comment: parentId
          ? {
              author,
              content,
              parentId,
            }
          : {
              author,
              content,
              targetUri: window.location.href,
            },
        queryKey,
        extra,
        onStart: () => {
          onSubmitStartRef.current?.();
        },
      });

      return result;
    },
    [postComment, parentId, extra, onSubmitStartRef],
  );

  return <BaseCommentForm {...props} onSubmit={handleSubmit} />;
}

type CommentEditFormProps<TExtraEditData = unknown> = Omit<
  BaseCommentFormProps,
  "defaultContent" | "onSubmit"
> & {
  comment: Comment;
  /**
   * Query key to a query where comment is stored
   */
  queryKey: QueryKey;
  /**
   * Extra data to be passed to edit comment
   */
  extra?: TExtraEditData;
  /**
   * Called when transaction was created.
   */
  onSubmitStart?: () => void;
};

export function CommentEditForm<TExtraEditData = unknown>({
  comment,
  queryKey,
  extra,
  onSubmitStart,
  submitIdleLabel = "Update",
  submitPendingLabel = "Updating...",
  ...props
}: CommentEditFormProps<TExtraEditData>) {
  const { editComment } = useCommentActions<TExtraEditData>();
  const onSubmitStartRef = useFreshRef(onSubmitStart);

  const handleSubmit = useCallback<OnSubmitFunction>(
    async ({ author, content }) => {
      const result = await editComment({
        address: author,
        comment,
        edit: { content, metadata: comment.metadata },
        queryKey,
        extra,
        onStart: () => {
          onSubmitStartRef.current?.();
        },
      });

      return result;
    },
    [editComment, comment, queryKey, extra, onSubmitStartRef],
  );

  return (
    <BaseCommentForm
      {...props}
      defaultContent={{
        content: comment.content,
        references: comment.references,
      }}
      onSubmit={handleSubmit}
      submitIdleLabel={submitIdleLabel}
      submitPendingLabel={submitPendingLabel}
    />
  );
}
