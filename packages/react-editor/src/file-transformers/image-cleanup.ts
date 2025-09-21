import { UsePinataUploadFilesFileTransformer } from "../hooks/use-pinata-upload-files";

/**
 * This function creates a file transformer that cleanups image metadata
 * by re-encoding using the `<canvas />` element.
 * Also has a option to adjust the quality of the image.
 *
 * @param outType - leave it `undefined` to use same file type as the innput,
 * otherwise you can use `image/jpeg` | `image/webp` | `image/png` to force the output file type
 * @param quality - 0..1 (used for JPEG/WebP)
 * @returns a file transformer that cleanups image metadata
 */
export function createImageCleanupTransformer({
  outType = undefined,
  quality = 0.9,
}: {
  outType?: "image/jpeg" | "image/webp" | "image/png";
  quality?: number;
} = {}): UsePinataUploadFilesFileTransformer {
  return async (file) => {
    const outputFileType = file.type ?? outType;
    const img = new Image();
    const fileObjectUrl = URL.createObjectURL(file);
    img.src = fileObjectUrl;
    const { width, height } = await retrieveImageDimensions(img);

    // Detached canvas
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("Failed to get canvas context");
    }

    ctx.drawImage(img, 0, 0);

    try {
      return await exportImage(canvas, file.name, outputFileType, quality);
    } finally {
      URL.revokeObjectURL(fileObjectUrl);
    }
  };
}

function retrieveImageDimensions(
  img: HTMLImageElement,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    // normally this would never happen, just in case somebody pass in a remote image
    const timeoutHandle = setTimeout(() => {
      reject(new Error("Timed out retrieving image dimensions"));
    }, 500);

    const handleComplete = () => {
      clearTimeout(timeoutHandle);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };

    // both properties are > 0, means it is already loaded
    if (img.naturalWidth && img.naturalHeight) {
      handleComplete();
      return;
    }

    img.onload = handleComplete;
    img.onerror = reject;
  });
}

async function exportImage(
  canvas: HTMLCanvasElement,
  fileName: string,
  outputFileType: string,
  quality: number,
): Promise<File> {
  return await new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob: Blob | null) => {
        if (!blob) {
          return reject(new Error("Failed to convert canvas to blob"));
        }

        const outFile = new File([blob], fileName, {
          type: outputFileType,
        });

        resolve(outFile);
      },
      outputFileType,
      quality,
    );
  });
}
