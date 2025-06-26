import type { IndexerAPICommentReferencesSchemaType } from "@ecp.eth/sdk/indexer";
import { cn } from "../helpers.js";
import { renderToReact } from "../renderer.js";
import { CommentMediaReference } from "./CommentMediaReference.js";
import { useMemo } from "react";

type CommentMediaReferencesProps = {
  className?: string;
  content: string;
  references: IndexerAPICommentReferencesSchemaType;
};

export function CommentMediaReferences({
  className,
  content,
  references,
}: CommentMediaReferencesProps) {
  const { mediaReferences } = useMemo(() => {
    return renderToReact({
      content,
      references,
    });
  }, [content, references]);

  if (mediaReferences.length === 0) {
    return null;
  }

  return (
    <div className={cn("flex gap-2 flex-wrap", className)}>
      {mediaReferences.map((reference, referenceIndex) => {
        return (
          <CommentMediaReference reference={reference} key={referenceIndex} />
        );
      })}
    </div>
  );
}
