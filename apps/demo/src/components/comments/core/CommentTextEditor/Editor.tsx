import {
  type Editor as TipTapEditor,
  type Content,
  EditorContent,
  useEditor,
} from "@tiptap/react";
import { Document } from "@tiptap/extension-document";
import { Paragraph } from "@tiptap/extension-paragraph";
import { Bold } from "@tiptap/extension-bold";
import { Italic } from "@tiptap/extension-italic";
import { Text } from "@tiptap/extension-text";
import { Link } from "@tiptap/extension-link";
import { Placeholder } from "@tiptap/extension-placeholder";
import { AddressMentionExtension } from "./extensions/AddressMention";
import { TokenMentionExtension } from "./extensions/TokenMention";
import { useEnsResolver } from "./hooks/useEnsResolver";
import { useTokenResolver } from "./hooks/useTokenResolver";
import { base } from "viem/chains";
import { cn } from "@/lib/utils";
import { useImperativeHandle } from "react";

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
  const ensResolver = useEnsResolver();
  const tokenResolver = useTokenResolver({
    // @todo use the chain from the context instead of hardcoding it
    // because chain can be changed
    chainId: base.id,
  });
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
      Bold,
      Italic,
      Link,
      Placeholder.configure({
        placeholder,
        emptyEditorClass:
          "is-editor-empty before:text-muted-foreground before:content-[attr(data-placeholder)] before:float-left before:h-0 before:pointer-events-none",
      }),
      AddressMentionExtension.configure({
        ensResolver,
      }),
      TokenMentionExtension.configure({
        tokenResolver,
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
