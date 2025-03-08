import { Fragment } from "react";

export function renderCommentContent(content: string) {
  return content
    .split("\n")
    .map((line) => {
      return <>{line}</>;
    })
    .reduce((nodes, lineNode, index) => {
      nodes.push(<Fragment key={`line-${index}`}>{lineNode}</Fragment>) ;
      nodes.push(<br key={`line-break-${index}`} />)
      return nodes;
    }, [] as React.ReactNode[]);
}
