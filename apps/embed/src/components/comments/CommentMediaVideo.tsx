import { useEffect, useMemo, useRef, useState } from "react";
import type { MediaDimensions } from "./types";
import { getMediaOrientation } from "./utils";
import type {
  UploadTrackerVideoComponent,
  UploadTrackerVideoComponentProps,
} from "@ecp.eth/react-editor/types";

export function CommentMediaVideo({
  fileOrUrl: file,
}: {
  fileOrUrl: File | string;
}) {
  const [dimensions, setDimensions] = useState<MediaDimensions | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const url = useMemo(() => {
    if (typeof file === "string") {
      return file;
    }

    return URL.createObjectURL(file);
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
        orientation: getMediaOrientation(video.videoWidth, video.videoHeight),
      });
    };

    video.addEventListener("loadedmetadata", updateDimensions);

    return () => video.removeEventListener("loadedmetadata", updateDimensions);
  }, []);

  const objectFit =
    dimensions?.orientation === "landscape" ? "contain" : "cover";

  const video = (
    <video
      ref={videoRef}
      src={url}
      controls
      className="max-w-full max-h-full rounded-md"
      style={{ objectFit }}
    />
  );

  return (
    <div className="w-full h-full flex items-center justify-center">
      {typeof file === "string" ? (
        <a href={file} target="_blank" rel="noopener noreferrer">
          {video}
        </a>
      ) : (
        video
      )}
    </div>
  );
}

export const CommentEditorMediaVideo: UploadTrackerVideoComponent = ({
  file,
}: UploadTrackerVideoComponentProps) => {
  return <CommentMediaVideo fileOrUrl={"url" in file ? file.url : file.file} />;
};
