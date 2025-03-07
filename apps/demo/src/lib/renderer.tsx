import { Fragment } from "react";

export function renderCommentContent(content: string) {
  return content
    .split("\n")
    .flatMap((line, index) => {
      const nodes: React.ReactNode[] = [];
      nodes.push(<Fragment key={`line-${index}`}>{line}</Fragment>) ;
      nodes.push(<br key={`line-break-${index}`} />)
      return nodes;
    })
}
