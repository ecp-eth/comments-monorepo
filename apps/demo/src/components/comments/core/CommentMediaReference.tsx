import type { AllowedMediaReferences } from "./renderer";
import { CommentMediaImage } from "./CommentMediaImage";
import { CommentMediaVideo } from "./CommentMediaVideo";
import { CommentMediaFile } from "./CommentMediaFile";

export type MediaDimensions = {
  width: number;
  height: number;
  orientation: "landscape" | "portrait" | "square";
};

export function CommentMediaReference({
  reference,
}: {
  reference: AllowedMediaReferences;
}) {
  switch (reference.type) {
    case "video":
      return (
        <CommentMediaReferenceWrapper>
          <CommentMediaVideo fileOrUrl={reference.url} />
        </CommentMediaReferenceWrapper>
      );
    case "image":
      return (
        <CommentMediaReferenceWrapper>
          <CommentMediaImage alt={reference.url} fileOrUrl={reference.url} />
        </CommentMediaReferenceWrapper>
      );
    case "file":
      return (
        <CommentMediaReferenceWrapper>
          <CommentMediaFile url={reference.url} name={reference.url} />
        </CommentMediaReferenceWrapper>
      );
    default:
      return null;
  }
}

function CommentMediaReferenceWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="w-[100px] h-[100px] flex flex-col items-center justify-center gap-2 p-2 border rounded-md bg-muted/30 overflow-hidden">
      {children}
    </div>
  );
}
