import { useEffect, useMemo, useRef, useState } from "react";
import type { MediaDimensions } from "./types.js";
import { getMediaOrientation } from "./utils.js";

export function CommentMediaImage({
  fileOrUrl,
  alt,
}: {
  fileOrUrl: File | string;
  alt: string;
}) {
  const [dimensions, setDimensions] = useState<MediaDimensions | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const url = useMemo(() => {
    if (typeof fileOrUrl === "string") {
      return fileOrUrl;
    }

    return URL.createObjectURL(fileOrUrl);
  }, [fileOrUrl]);

  useEffect(() => {
    const img = imgRef.current;

    if (!img) {
      return;
    }

    const updateDimensions = () => {
      setDimensions({
        width: img.naturalWidth,
        height: img.naturalHeight,
        orientation: getMediaOrientation(img.naturalWidth, img.naturalHeight),
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

  const image = (
    <img
      ref={imgRef}
      src={url}
      alt={alt}
      className="max-w-full max-h-full rounded-md"
      style={{ objectFit }}
    />
  );

  if (typeof fileOrUrl === "string") {
    return (
      <a
        className="w-full h-full flex items-center justify-center"
        href={fileOrUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        {image}
      </a>
    );
  }

  return (
    <div className="w-full h-full flex items-center justify-center">
      {image}
    </div>
  );
}
