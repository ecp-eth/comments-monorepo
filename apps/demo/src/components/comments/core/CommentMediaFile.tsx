import { FileIcon } from "lucide-react";

export function CommentMediaFile({
  url,
  name,
}: {
  url?: string;
  name: string;
}) {
  const content = (
    <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-2 border rounded-md bg-muted/30 overflow-hidden">
      <FileIcon className="text-muted-foreground" size={40} />
      <span className="text-xs truncate max-w-[90px]">{name}</span>
    </div>
  );

  if (url) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer">
        {content}
      </a>
    );
  }

  return content;
}
