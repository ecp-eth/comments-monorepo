import { useMemo } from "react";
import { customMarkdownParser } from "./CommentTextEditor/serializers/markdown";
import { renderModel } from "./CommentTextEditor/serializers/renderer";

export function CommentText({ text }: { text: string }) {
  const content = useMemo(() => {
    return renderModel(customMarkdownParser.parse(text));
  }, [text]);

  return <div>{content}</div>;
}
