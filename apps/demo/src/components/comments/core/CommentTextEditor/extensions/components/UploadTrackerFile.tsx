import { type UploadTrackerFile } from "../types";
import { XIcon } from "lucide-react";
import { CommentMediaVideo } from "../../../CommentMediaVideo";
import { CommentMediaImage } from "../../../CommentMediaImage";
import { CommentMediaFile } from "../../../CommentMediaFile";

type UploadTrackerFileProps = {
  file: UploadTrackerFile;
  onDeleteClick: () => void;
};

export function UploadTrackerFile({
  file,
  onDeleteClick,
}: UploadTrackerFileProps) {
  const isImage = file.mimeType.startsWith("image/");
  const isVideo = file.mimeType.startsWith("video/");

  return (
    <div className="w-[100px] h-[100px] p-2 border rounded-md bg-muted/30 relative">
      <button
        className="absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 bg-muted shadow-sm border rounded-full p-1"
        type="button"
        onClick={onDeleteClick}
        aria-label="Remove file"
        title="Remove file"
      >
        <XIcon className="text-muted-foreground" size={12} />
      </button>

      {isVideo ? (
        <CommentMediaVideo fileOrUrl={"url" in file ? file.url : file.file} />
      ) : null}
      {isImage ? (
        <CommentMediaImage
          fileOrUrl={"url" in file ? file.url : file.file}
          alt={file.name}
        />
      ) : null}
      {!isImage && !isVideo ? (
        <CommentMediaFile
          url={"url" in file ? file.url : undefined}
          name={file.name}
        />
      ) : null}
    </div>
  );
}
