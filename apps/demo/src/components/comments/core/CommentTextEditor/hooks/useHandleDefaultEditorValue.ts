import type { IndexerAPICommentReferencesSchemaType } from "@ecp.eth/sdk/indexer";
import type { JSONContent } from "@tiptap/core";
import { useMemo } from "react";
import { parse } from "../parser";

export function useHandleDefaultEditorValue(
  defaultValue: string | undefined,
  references: IndexerAPICommentReferencesSchemaType = [],
): JSONContent {
  return useMemo(() => {
    return parse(defaultValue ?? "", references);
  }, [defaultValue, references]);
}
