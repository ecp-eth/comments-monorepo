import type { IndexerAPICommentReferencesSchemaType } from "@ecp.eth/sdk/indexer";
import type { JSONContent } from "@tiptap/core";
import { useMemo } from "react";
import { parse } from "../parser.js";
import { EditorTheme } from "../editor.type.js";

export function useHandleDefaultEditorValue(
  defaultValue: string | undefined,
  references: IndexerAPICommentReferencesSchemaType = [],
  theme?: EditorTheme,
): JSONContent {
  return useMemo(() => {
    return parse(defaultValue ?? "", references, theme);
  }, [defaultValue, references, theme]);
}
