export function renderCommentContent(content: string) {
  return content
    .split("\n")
    .map((line) => {
      return <>{line}</>;
    })
    .reduce((nodes, lineNode, index) => {
      return [...nodes, lineNode, <br key={`line-${index}`} />];
    }, [] as React.ReactNode[]);
}
