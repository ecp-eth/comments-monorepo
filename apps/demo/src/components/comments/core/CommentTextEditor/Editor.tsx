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
import { useImperativeHandle } from "react";
import { useAddressSuggestions } from "./hooks/useAddressSuggestions";
import { AddressMentionExtension } from "./extensions/AddressMention";

export type EditorRef = {
  focus: () => void;
  editor: TipTapEditor | null;
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
    }),
    [editor],
  );

  return (
    <>
      <EditorContent editor={editor} />
    </>
  );
}
