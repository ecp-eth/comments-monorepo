import { TRUNCATE_COMMENT_LENGTH } from "@/lib/constants";
import { renderCommentContent } from "@/lib/renderer";
import { useState } from "react";

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }

  return text.slice(0, maxLength).trim() + "...";
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
