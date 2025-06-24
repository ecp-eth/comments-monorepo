import {
  type Editor as TipTapEditor,
  EditorContent,
  type JSONContent,
  useEditor,
} from "@tiptap/react";
import { Document } from "@tiptap/extension-document";
import { Paragraph } from "@tiptap/extension-paragraph";
import { Text } from "@tiptap/extension-text";
import { Link } from "@tiptap/extension-link";
import { Placeholder } from "@tiptap/extension-placeholder";
import { useImperativeHandle, useState } from "react";
import { MentionExtension } from "./extensions/Mention";
import {
  type UploadTrackerUploadedFile,
  type UploadTrackerAttributes,
  type UploadTrackerFileToUpload,
  UPLOAD_TRACKER_NODE_NAME,
  UploadTracker,
} from "./extensions/UploadTracker";
import { HardBreak } from "@tiptap/extension-hard-break";
import type { IndexerAPICommentReferencesSchemaType } from "@ecp.eth/sdk/indexer";
import { useHandleDefaultEditorValue } from "./hooks/useHandleDefaultEditorValue";
import type { LinkAttributes } from "./extensions/types";
import { cn } from "@ecp.eth/shared/helpers";
import { ALLOWED_UPLOAD_MIME_TYPES } from "./constants";
import type { SearchSuggestionsFunction } from "./types";

export type EditorRef = {
  focus: () => void;
  /**
   * Clears the editor content
   */
  clear: () => void;
  editor: TipTapEditor | null;
  getDefaultContent: () => JSONContent;
  getUploadedFiles: () => UploadTrackerUploadedFile[];
  getFilesForUpload: () => UploadTrackerFileToUpload[];
  setFileAsUploaded: (file: UploadTrackerUploadedFile) => void;
  setFileUploadAsFailed: (fileId: string) => void;
  addFiles: (files: File[]) => void;
};

export type EditorProps = {
  /**
   * @default ALLOWED_UPLOAD_MIME_TYPES
   */
  allowedUploadMimeTypes?: string[];
  className?: string;
  disabled?: boolean;
  defaultValue?: {
    content: string;
    references: IndexerAPICommentReferencesSchemaType;
  };
  placeholder: string;
  /**
   * @default false
   */
  autoFocus?: boolean;
  ref?: React.Ref<EditorRef>;
  onBlur?: () => void;
  onEscapePress?: () => void;
  searchSuggestions: SearchSuggestionsFunction;
};

export function Editor({
  allowedUploadMimeTypes = ALLOWED_UPLOAD_MIME_TYPES,
  className,
  disabled = false,
  placeholder,
  autoFocus = false,
  ref,
  onBlur,
  onEscapePress,
  defaultValue,
  searchSuggestions,
}: EditorProps) {
  const [isDragging, setIsDragging] = useState(false);
  const content = useHandleDefaultEditorValue(
    defaultValue?.content,
    defaultValue?.references,
  );

  const editor = useEditor({
    content,
    // fix ssr hydration error
    immediatelyRender: false,
    autofocus: autoFocus,
    editable: !disabled,
    onBlur,
    extensions: [
      Document,
      Paragraph,
      Text,
      HardBreak,
      Link.configure({
        HTMLAttributes: {
          class: "underline cursor-pointer" satisfies LinkAttributes["class"],
        },
      }),
      Placeholder.configure({
        placeholder,
        emptyEditorClass:
          "is-editor-empty before:text-muted-foreground before:content-[attr(data-placeholder)] before:float-left before:h-0 before:pointer-events-none",
      }),
      // ens, farcaster, erc20, address mentions
      MentionExtension.configure({
        searchSuggestions,
        suggestion: {
          char: "@",
        },
      }),
      UploadTracker,
    ],
    editorProps: {
      attributes: {
        class: cn(
          "flex flex-col min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm",
          disabled && "cursor-not-allowed opacity-50",
          className,
        ),
      },
      handleKeyPress(view, event) {
        if (event.key === "Escape") {
          onEscapePress?.();

          return true;
        }

        return false;
      },
    },
  });

  useImperativeHandle(
    ref,
    () => ({
      clear: () => {
        editor?.view.dispatch(
          editor.view.state.tr
            .setMeta("wantsToClearEditor", true)
            .delete(0, editor.state.doc.content.size),
        );
      },
      focus: () => {
        editor?.commands.focus();
      },
      editor,
      addFiles: (files) => {
        for (const file of files) {
          editor?.commands.addFile({
            id: crypto.randomUUID(),
            name: file.name,
            file,
            mimeType: file.type,
          });
        }
      },
      setFileAsUploaded: (file) => {
        editor?.commands.updateFile(file);
      },
      setFileUploadAsFailed: (fileId: string) => {
        editor?.commands.removeUploadedFile(fileId);
      },
      getUploadedFiles: () => {
        const node = editor?.state.doc.lastChild;

        if (node?.type.name === UPLOAD_TRACKER_NODE_NAME) {
          const files = (node.attrs as UploadTrackerAttributes).uploads || [];

          return files.filter(
            (file): file is UploadTrackerUploadedFile => "url" in file,
          );
        }

        console.warn("Last node is not a upload tracker node");

        return [];
      },
      getFilesForUpload: () => {
        const node = editor?.state.doc.lastChild;

        if (node?.type.name === UPLOAD_TRACKER_NODE_NAME) {
          const files = (node.attrs as UploadTrackerAttributes).uploads || [];

          return files.filter(
            (file): file is UploadTrackerFileToUpload => "file" in file,
          );
        }

        console.warn("Last node is not a upload tracker node");

        return [];
      },
      getDefaultContent() {
        return content;
      },
    }),
    [editor, content],
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();

    const files = Array.from(e.dataTransfer.items);

    if (files.length === 0) {
      return;
    }

    const isAllowed = files.every((file) =>
      allowedUploadMimeTypes.includes(file.type),
    );

    if (!isAllowed) {
      e.dataTransfer.dropEffect = "none";
      setIsDragging(false);
    } else {
      e.dataTransfer.dropEffect = "copy";
      setIsDragging(true);
    }
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);

    if (files.length === 0) {
      return;
    }

    const isAllowed = files.every((file) =>
      allowedUploadMimeTypes.includes(file.type),
    );

    if (!isAllowed) {
      return;
    }

    for (const file of files) {
      const fileId = crypto.randomUUID();

      editor?.commands.addFile({
        id: fileId,
        name: file.name,
        file,
        mimeType: file.type,
      });
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "relative",
        isDragging &&
          "after:absolute after:inset-0 after:bg-primary/10 after:border-2 after:border-dashed after:border-primary",
      )}
    >
      <EditorContent editor={editor} />
    </div>
  );
}
