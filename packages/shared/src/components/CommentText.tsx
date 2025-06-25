import type { IndexerAPICommentReferencesSchemaType } from "@ecp.eth/sdk/indexer";
import { renderToReact } from "../renderer.js";
import { useMemo, useState } from "react";

type CommentTextProps = {
  className?: string;
  content: string;
  references: IndexerAPICommentReferencesSchemaType;
  /**
   * @default 200
   */
  maxLength?: number;
  /**
   * @default 5
   */
  maxLines?: number;
};

export function CommentText({
  className,
  content,
  references,
  maxLength = 200,
  maxLines = 5,
}: CommentTextProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { element, isTruncated } = useMemo(() => {
    return renderToReact({
      content,
      references,
      ...(isExpanded
        ? { maxLength: undefined, maxLines: undefined }
        : {
            maxLength,
            maxLines,
          }),
    });
  }, [content, references, maxLength, maxLines, isExpanded]);

  return (
    <div className={className}>
      {element}
      {isTruncated && !isExpanded ? (
        <>
          {" "}
          <button
            onClick={() => setIsExpanded(true)}
            className="text-accent-foreground inline whitespace-nowrap underline"
            type="button"
          >
            Show more
          </button>
        </>
      ) : null}
    </div>
  );
}
