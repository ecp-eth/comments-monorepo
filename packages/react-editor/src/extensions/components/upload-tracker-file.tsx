import type {
  UploadTrackerFile,
  UploadTrackerFileComponent,
  UploadTrackerImageComponent,
  UploadTrackerVideoComponent,
} from "../types.js";

type UploadTrackerFileProps = {
  file: UploadTrackerFile;
  onDeleteClick: () => void;
  imageComponent: UploadTrackerImageComponent;
  videoComponent: UploadTrackerVideoComponent;
  fileComponent: UploadTrackerFileComponent;
  className?: string;
  deleteButtonClassName?: string;
};

export function UploadTrackerFile({
  file,
  onDeleteClick,
  imageComponent: ImageComponent,
  videoComponent: VideoComponent,
  fileComponent: FileComponent,
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

      {isVideo ? <VideoComponent file={file} /> : null}
      {isImage ? <ImageComponent file={file} /> : null}
      {!isImage && !isVideo ? <FileComponent file={file} /> : null}
    </div>
  );
}
