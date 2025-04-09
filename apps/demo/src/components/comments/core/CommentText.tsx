import {
  TRUNCATE_COMMENT_LENGTH,
  TRUNCATE_COMMENT_LINES,
} from "@/lib/constants";
import { renderCommentContent } from "@/lib/renderer";
import { truncateText } from "@ecp.eth/shared/helpers";
import { useState } from "react";

export function CommentText({ text }: { text: string }) {
  const [shownText, setShownText] = useState(() =>
    truncateText(text, TRUNCATE_COMMENT_LENGTH, TRUNCATE_COMMENT_LINES)
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
