import { truncateText } from "../helpers.js";
import { Fragment, useState } from "react";

function renderCommentContent(content: string) {
  return content.split("\n").flatMap((line, index) => {
    const nodes: React.ReactNode[] = [];
    nodes.push(<Fragment key={`line-${index}`}>{line}</Fragment>);
    nodes.push(<br key={`line-break-${index}`} />);
    return nodes;
  });
}

type CommentTextProps = {
  text: string;
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
  text,
  maxLength = 200,
  maxLines = 5,
}: CommentTextProps) {
  const [shownText, setShownText] = useState(() =>
    truncateText(text, maxLength, maxLines),
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
