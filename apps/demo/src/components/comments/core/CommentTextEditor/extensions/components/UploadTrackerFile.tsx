import { useEffect, useMemo, useRef, useState } from "react";
import { type UploadTrackerFile } from "../types";
import { FileIcon, XIcon } from "lucide-react";

export type MediaDimensions = {
  width: number;
  height: number;
  orientation: "landscape" | "portrait" | "square";
};

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

  if (isVideo || isImage) {
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

        {isVideo ? <Video file={file} /> : null}
        {isImage ? <Image file={file} /> : null}
      </div>
    );
  }

  return (
    <div className="w-[100px] h-[100px] flex flex-col items-center justify-center gap-2 p-2 border rounded-md bg-muted/30 overflow-hidden">
      <FileIcon className="text-muted-foreground" size={40} />
      <span className="text-xs truncate max-w-[90px]">{file.name}</span>
    </div>
  );
}

function Image({ file }: { file: UploadTrackerFile }) {
  const [dimensions, setDimensions] = useState<MediaDimensions | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const url = useMemo(() => {
    if ("url" in file) {
      return file.url;
    }

    return URL.createObjectURL(file.file);
  }, [file]);

  useEffect(() => {
    const img = imgRef.current;

    if (!img) {
      return;
    }

    const updateDimensions = () => {
      setDimensions({
        width: img.naturalWidth,
        height: img.naturalHeight,
        orientation:
          img.naturalWidth > img.naturalHeight
            ? "landscape"
            : img.naturalWidth < img.naturalHeight
              ? "portrait"
              : "square",
      });
    };

    // For cached images that load immediately
    if (img.complete) {
      updateDimensions();
    }

    // For new images that need to load
    img.addEventListener("load", updateDimensions);

    return () => img.removeEventListener("load", updateDimensions);
  }, []);

  const objectFit =
    dimensions?.orientation === "landscape" ? "contain" : "cover";

  return (
    <div className="w-full h-full flex items-center justify-center">
      <img
        ref={imgRef}
        src={url}
        alt={file.name}
        className="max-w-full max-h-full rounded-md"
        style={{ objectFit }}
      />
    </div>
  );
}

function Video({ file }: { file: UploadTrackerFile }) {
  const [dimensions, setDimensions] = useState<MediaDimensions | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const url = useMemo(() => {
    if ("url" in file) {
      return file.url;
    }

    return URL.createObjectURL(file.file);
  }, [file]);

  useEffect(() => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    const updateDimensions = () => {
      setDimensions({
        width: video.videoWidth,
        height: video.videoHeight,
        orientation:
          video.videoWidth > video.videoHeight
            ? "landscape"
            : video.videoWidth < video.videoHeight
              ? "portrait"
              : "square",
      });
    };

    video.addEventListener("loadedmetadata", updateDimensions);

    return () => video.removeEventListener("loadedmetadata", updateDimensions);
  }, []);

  const objectFit =
    dimensions?.orientation === "landscape" ? "contain" : "cover";

  return (
    <div className="w-full h-full flex items-center justify-center">
      <video
        ref={videoRef}
        src={url}
        controls
        className="max-w-full max-h-full rounded-md"
        style={{ objectFit }}
      />
    </div>
  );
}
