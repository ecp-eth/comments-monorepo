import { EditorContent, useEditor } from "@tiptap/react";
import { Document } from "@tiptap/extension-document";
import { Paragraph } from "@tiptap/extension-paragraph";
import { Text } from "@tiptap/extension-text";
import { Placeholder } from "@tiptap/extension-placeholder";
import { AddressMentionExtension } from "./extensions/AddressMention";
import { TokenMentionExtension } from "./extensions/TokenMention";
import { useEnsResolver } from "./hooks/useEnsResolver";
import { useTokenResolver } from "./hooks/useTokenResolver";
import { base } from "viem/chains";

type EditorProps = {
  placeholder: string;
};

export function Editor({ placeholder }: EditorProps) {
  const ensResolver = useEnsResolver();
  const tokenResolver = useTokenResolver({
    // @todo use the chain from the context instead of hardcoding it
    // because chain can be changed
    chainId: base.id,
  });
  const editor = useEditor({
    // fix ssr hydration error
    immediatelyRender: false,
    extensions: [
      Document,
      Paragraph,
      Text,
      Placeholder.configure({
        placeholder,
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
        class:
          "flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
      },
    },
  });

  return (
    <>
      <EditorContent editor={editor} />
    </>
  );
}
