// in order to make tsup builds the css, we need to import it
import "./editor.css";
import { useImperativeHandle, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import { Document } from "@tiptap/extension-document";
import { Paragraph } from "@tiptap/extension-paragraph";
import { Text } from "@tiptap/extension-text";
import { Link } from "@tiptap/extension-link";
import { Placeholder } from "@tiptap/extension-placeholder";
import { HardBreak } from "@tiptap/extension-hard-break";
import { MentionOptions } from "@tiptap/extension-mention";
import { cn } from "@ecp.eth/shared/helpers";
import { MentionExtension } from "./extensions/mention-extension.js";
import {
  type UploadTrackerUploadedFile,
  type UploadTrackerAttributes,
  type UploadTrackerFileToUpload,
  UPLOAD_TRACKER_NODE_NAME,
  UploadTracker,
} from "./extensions/upload-tracker.js";
import { useHandleDefaultEditorValue } from "./hooks/use-handle-default-editor-value.js";
import { CommentEditorMediaImage } from "./components/CommentEditorMediaImage.js";
import { CommentEditorMediaVideo } from "./components/CommentEditorMediaVideo.js";
import { CommentEditorMediaFile } from "./components/CommentEditorMediaFile.js";
import { EditorProps } from "./editor.type.js";
import { defaultTheme } from "./default-theme.js";
import { useThemeStylesheetText } from "./hooks/use-theme-stylesheet-text.js";
import { MentionItem } from "./types.js";

export type { EditorProps, EditorRef } from "./editor.type.js";

type EditorWebProps = {
  mentionSuggestionRenderer?: () => MentionOptions<
    MentionItem,
    MentionItem
  >["suggestion"]["render"];
};

export function Editor({
  disabled = false,
  placeholder,
  autoFocus = false,
  ref,
  onCreate,
  onUpdate,
  onBlur,
  onEscapePress,
  defaultValue,
  suggestions,
  suggestionsTheme,
  uploads,
  imageComponent = CommentEditorMediaImage,
  videoComponent = CommentEditorMediaVideo,
  fileComponent = CommentEditorMediaFile,
  theme,
  mentionSuggestionRenderer,
}: EditorProps & EditorWebProps) {
  useThemeStylesheetText(theme);
  const [isDropping, setIsDropping] = useState(false);
  const content = useHandleDefaultEditorValue(
    defaultValue?.content,
    defaultValue?.references,
    theme,
  );

  const editor = useEditor({
    content,
    // fix ssr hydration error
    immediatelyRender: false,
    autofocus: autoFocus,
    editable: !disabled,
    onCreate,
    onUpdate,
    onBlur,
    extensions: [
      Document,
      Paragraph,
      Text,
      HardBreak,
      Link.configure({
        HTMLAttributes: {
          class: theme?.link?.classNames ?? defaultTheme.link.classNames,
        },
      }),
      Placeholder.configure({
        placeholder,
        emptyEditorClass:
          theme?.placeholder?.classNames ?? defaultTheme.placeholder.classNames,
      }),
      // ens, farcaster, erc20, address mentions
      MentionExtension.configure({
        searchSuggestions: suggestions.search,
        suggestion: {
          char: "@",
        },
        theme: suggestionsTheme,
        mentionSuggestionRenderer,
      }),
      UploadTracker.configure({
        imageComponent,
        videoComponent,
        fileComponent,
      }),
    ],
    editorProps: {
      attributes: {
        class: cn(
          theme?.editor?.classNames ?? defaultTheme.editor.classNames,
          disabled &&
            (theme?.editor_disabled?.classNames ??
              defaultTheme.editor_disabled.classNames),
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
      getText: async () => {
        return editor?.getText() ?? "";
      },
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
      getUploadedFiles: async () => {
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
      getFilesForUpload: async () => {
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
      async getDefaultContent() {
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
      uploads.allowedMimeTypes.includes(file.type),
    );

    if (!isAllowed) {
      e.dataTransfer.dropEffect = "none";
      setIsDropping(false);
    } else {
      e.dataTransfer.dropEffect = "copy";
      setIsDropping(true);
    }
  };

  const handleDragLeave = () => {
    setIsDropping(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDropping(false);

    const files = Array.from(e.dataTransfer.files);

    if (files.length === 0) {
      return;
    }

    const isAllowed = files.every(
      (file) =>
        uploads.allowedMimeTypes.includes(file.type) &&
        file.size <= uploads.maxFileSize,
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
        theme?.editorContainer?.classNames ??
          defaultTheme.editorContainer.classNames,
        isDropping &&
          (theme?.editorContainer_dropTarget?.classNames ??
            defaultTheme.editorContainer_dropTarget.classNames),
      )}
    >
      <EditorContent editor={editor} />
    </div>
  );
}
