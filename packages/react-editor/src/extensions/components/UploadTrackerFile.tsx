import { type UploadTrackerFile } from "../types";

type UploadTrackerFileProps = {
  file: UploadTrackerFile;
  onDeleteClick: () => void;
  renderImage?: (file: UploadTrackerFile) => React.ReactNode;
  renderVideo?: (file: UploadTrackerFile) => React.ReactNode;
  renderFile?: (file: UploadTrackerFile) => React.ReactNode;
  className?: string;
  deleteButtonClassName?: string;
};

export function UploadTrackerFile({
  file,
  onDeleteClick,
  renderImage,
  renderVideo,
  renderFile,
  className = "w-[100px] h-[100px] p-2 border rounded-md bg-muted/30 relative",
  deleteButtonClassName = "absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 bg-muted shadow-sm border rounded-full p-1",
}: UploadTrackerFileProps) {
  const isImage = file.mimeType.startsWith("image/");
  const isVideo = file.mimeType.startsWith("video/");

  return (
    <div className={className}>
      <button
        className={deleteButtonClassName}
        type="button"
        onClick={onDeleteClick}
        aria-label="Remove file"
        title="Remove file"
      >
        <svg
          className="text-muted-foreground"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      </button>

      {isVideo && renderVideo ? (
        renderVideo(file)
      ) : isImage && renderImage ? (
        renderImage(file)
      ) : renderFile ? (
        renderFile(file)
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <span className="text-sm text-muted-foreground">{file.name}</span>
        </div>
      )}
    </div>
  );
}
