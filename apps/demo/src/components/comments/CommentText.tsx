import {
  TRUNCATE_COMMENT_LENGTH,
  TRUNCATE_COMMENT_LINES,
} from "@/lib/constants";
import { renderCommentContent } from "@/lib/renderer";
import { useState } from "react";

function truncateText(text: string, maxLength: number): string {
  const splitByNewline = text.split("\n");
  let truncated = text;

  if (splitByNewline.length > TRUNCATE_COMMENT_LINES) {
    truncated =
      splitByNewline
        .slice(0, TRUNCATE_COMMENT_LINES)
        .filter(Boolean)
        .join("\n") + "...";
  }

  if (truncated.length <= maxLength) {
    return truncated;
  }

  return truncated.slice(0, maxLength).trim() + "...";
}

export function CommentText({ text }: { text: string }) {
  const [shownText, setShownText] = useState(
    truncateText(text, TRUNCATE_COMMENT_LENGTH)
  );
  const isTruncated = text.length > shownText.length;

  return (
    <>
      {renderCommentContent(shownText)}
      {isTruncated ? (
        <>
          {" "}
          <button
            onClick={() => setShownText(text)}
            className="text-accent-foreground inline whitespace-nowrap underline"
            type="button"
          >
            Show more
          </button>
        </>
      ) : null}
    </>
  );
}
