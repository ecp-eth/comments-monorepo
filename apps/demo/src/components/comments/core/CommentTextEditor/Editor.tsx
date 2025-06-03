import {
  type Editor as TipTapEditor,
  type Content,
  EditorContent,
  useEditor,
} from "@tiptap/react";
import { Document } from "@tiptap/extension-document";
import { Paragraph } from "@tiptap/extension-paragraph";
import { Text } from "@tiptap/extension-text";
import { Link } from "@tiptap/extension-link";
import { Placeholder } from "@tiptap/extension-placeholder";
import { cn } from "@/lib/utils";
import { useImperativeHandle, useState } from "react";
import { useAddressSuggestions } from "./hooks/useAddressSuggestions";
import { AddressMentionExtension } from "./extensions/AddressMention";
import {
  type UploadedFile,
  type UploadTrackerAttributes,
  UPLOAD_TRACKER_NODE_NAME,
  UploadTracker,
} from "./extensions/UploadTracker";
import { useUploadFiles } from "./hooks/useUploadFiles";
import { ALLOWED_UPLOAD_MIME_TYPES } from "@/lib/constants";

export type EditorRef = {
  focus: () => void;
  editor: TipTapEditor | null;
  getUploadedFiles: () => UploadedFile[];
};

type EditorProps = {
  className?: string;
  disabled?: boolean;
  defaultValue?: Content;
  placeholder: string;
  /**
   * @default false
   */
  autoFocus?: boolean;
  ref?: React.Ref<EditorRef>;
  onBlur?: () => void;
  onEscapePress?: () => void;
};

export function Editor({
  className,
  disabled = false,
  placeholder,
  autoFocus = false,
  ref,
  onBlur,
  onEscapePress,
  defaultValue,
}: EditorProps) {
  const [isDragging, setIsDragging] = useState(false);
  const searchAddressSuggestions = useAddressSuggestions();
  const { uploadFiles } = useUploadFiles();

  const editor = useEditor({
    content: defaultValue,
    // fix ssr hydration error
    immediatelyRender: false,
    autofocus: autoFocus,
    editable: !disabled,
    onBlur,
    extensions: [
      Document,
      Paragraph,
      Text,
      Link.configure({
        HTMLAttributes: {
          class: "underline cursor-pointer",
        },
      }),
      Placeholder.configure({
        placeholder,
        emptyEditorClass:
          "is-editor-empty before:text-muted-foreground before:content-[attr(data-placeholder)] before:float-left before:h-0 before:pointer-events-none",
      }),
      AddressMentionExtension.configure({
        searchAddressSuggestions,
      }),
      UploadTracker,
    ],
    editorProps: {
      attributes: {
        class: cn(
          "flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm",
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
      focus: () => {
        editor?.commands.focus();
      },
      editor,
      getUploadedFiles: () => {
        const node = editor?.state.doc.lastChild;

        if (node?.type.name === UPLOAD_TRACKER_NODE_NAME) {
          return (node.attrs as UploadTrackerAttributes).uploads || [];
        }

        console.warn("Last node is not a upload tracker node");

        return [];
      },
    }),
    [editor],
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();

    const files = Array.from(e.dataTransfer.items);

    if (files.length === 0) {
      return;
    }

    const isAllowed = files.every((file) =>
      ALLOWED_UPLOAD_MIME_TYPES.includes(file.type),
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
      ALLOWED_UPLOAD_MIME_TYPES.includes(file.type),
    );

    if (!isAllowed) {
      return;
    }

    // Upload files and track progress
    uploadFiles(files, {
      onSuccess: (file) => {
        editor?.commands.addUploadedFile(file);
      },
      onError: (fileId) => {
        editor?.commands.removeUploadedFile(fileId);
      },
    });
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
