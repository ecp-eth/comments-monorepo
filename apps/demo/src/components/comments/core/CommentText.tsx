import { useMemo } from "react";
import { renderToReact } from "./renderer";
import type { IndexerAPICommentReferencesSchemaType } from "@ecp.eth/sdk/indexer";

export function CommentText({
  content,
  references,
}: {
  content: string;
  references: IndexerAPICommentReferencesSchemaType;
}) {
  const elements = useMemo(() => {
    return renderToReact({
      content,
      references,
    });
  }, [content, references]);

  return <div>{elements}</div>;
}
