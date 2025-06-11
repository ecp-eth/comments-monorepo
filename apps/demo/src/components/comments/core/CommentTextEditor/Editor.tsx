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
  type UploadTrackerUploadedFile,
  type UploadTrackerAttributes,
  type UploadTrackerFileToUpload,
  UPLOAD_TRACKER_NODE_NAME,
  UploadTracker,
} from "./extensions/UploadTracker";
import { ALLOWED_UPLOAD_MIME_TYPES } from "@/lib/constants";
import { HardBreak } from "@tiptap/extension-hard-break";

export type EditorRef = {
  focus: () => void;
  editor: TipTapEditor | null;
  getUploadedFiles: () => UploadTrackerUploadedFile[];
  getFilesForUpload: () => UploadTrackerFileToUpload[];
  setFileAsUploaded: (file: UploadTrackerUploadedFile) => void;
  setFileUploadAsFailed: (fileId: string) => void;
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
      HardBreak,
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
      focus: () => {
        editor?.commands.focus();
      },
      editor,
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
