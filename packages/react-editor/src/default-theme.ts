import { EditorTheme } from "./editor.type";
import { cn } from "@ecp.eth/shared/helpers";

export const defaultTheme = {
  editorContainer: {
    classNames: cn("relative"),
  },
  editorContainer_dropTarget: {
    classNames:
      "after:absolute after:inset-0 after:bg-primary/10 after:border-2 after:border-dashed after:border-primary",
  },
  editor: {
    classNames:
      "flex flex-col min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm",
  },
  editor_disabled: {
    classNames: "cursor-not-allowed opacity-50",
  },
  link: {
    classNames: "cursor-pointer underline",
  },
  placeholder: {
    classNames:
      "is-editor-empty before:text-muted-foreground before:content-[attr(data-placeholder)] before:float-left before:h-0 before:pointer-events-none",
  },
} satisfies EditorTheme;
