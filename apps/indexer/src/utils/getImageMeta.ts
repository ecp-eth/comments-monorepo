import { Readable } from "stream";
import { ReadableStream } from "stream/web";
import { imageSize } from "image-size";
import { z } from "zod";

const metaSchema = z.object({
  width: z.number(),
  height: z.number(),
  mediaType: z.string().optional(),
});
export type ImageMetaSchemaType = z.infer<typeof metaSchema>;
// It looks like commonly the image header can be retrieved within the specified limit, so we set it as buffer limit
// to avoid somebody deliberately forge a response with large content-length to exploit the server
const MAX_IMAGE_HEADER_LENGTH = 1024 * 30;

// image-size type to media type mapping
const imageSizeTypeToMediaSubType = {
  bmp: "bmp",
  cur: "x-icon",
  dds: "dds",
  gif: "gif",
  heif: "heif",
  icns: "icns",
  ico: "vnd.microsoft.icon",
  j2c: "j2c",
  jp2: "jp2",
  jpg: "jpeg",
  jxl: "jxl",
  "jxl-stream": "jxl",
  ktx: "ktx",
  png: "png",
  pnm: "x-portable-anymap",
  psd: "vnd.adobe.photoshop",
  svg: "svg+xml",
  tga: "tga",
  tiff: "tiff",
  webp: "webp",
};

type KnownImageSizeType = keyof typeof imageSizeTypeToMediaSubType;

/**
 * lightweight function to get the dimension of an image from a response,
 * it stops reading the stream immediately after getting the dimension
 * @param response
 * @param requestAbortController the abort controller to abort the underlying request stream
 * @returns
 */
export async function getImageMeta(
  response: Response,
  requestAbortController: AbortController,
): Promise<ImageMetaSchemaType | undefined> {
  if (!response.ok || !response.body) {
    return;
  }

  if (requestAbortController.signal.aborted) {
    return;
  }

  const contentLength = getAppropriateContentLength(response);
  const stream = Readable.fromWeb(response.body as unknown as ReadableStream);
  const maxHeaderLength = Math.min(contentLength, MAX_IMAGE_HEADER_LENGTH);

  return new Promise((resolve, reject) => {
    const buffer = Buffer.alloc(maxHeaderLength, 0);
    let meta: z.infer<typeof metaSchema> | undefined;
    let imageSizeError: unknown;
    let offset = 0;

    stream.on("data", (chunk) => {
      if (!Buffer.isBuffer(chunk)) {
        return;
      }

      if (offset > buffer.length) {
        requestAbortController.abort();
        return;
      }

      chunk.copy(buffer, offset);
      offset += chunk.length;

      try {
        const imageSizeMeta = imageSize(buffer);
        const mediaSubType =
          imageSizeMeta.type !== undefined &&
          isKnownImageSizeType(imageSizeMeta.type)
            ? imageSizeTypeToMediaSubType[imageSizeMeta.type]
            : undefined;
        meta = metaSchema.parse({
          ...imageSizeMeta,
          ...(mediaSubType !== undefined
            ? { mediaType: "image/" + mediaSubType }
            : undefined),
        });
      } catch (err) {
        // imageSize fails if the buffer is not enough for getting the image dimension
        // so we just record the last error thrown, in the end if no size found then we throw the last error
        imageSizeError = err;
        return;
      }

      if (meta) {
        try {
          requestAbortController.abort();
        } catch (err) {
          console.error("abort throws", err);
        }
      }
    });

    const handleErrorOrEnd = (err: unknown = imageSizeError) => {
      if (meta) {
        // the error callback can be triggered due to aborting the controller
        resolve(metaSchema.parse(meta));
        return;
      }

      reject(err ?? new Error("Failed to get image dimension"));
    };

    stream.on("error", handleErrorOrEnd);
    stream.on("end", handleErrorOrEnd);
  });
}

function getAppropriateContentLength(response: Response): number {
  let contentLength = parseInt(response.headers.get("content-length") ?? "");
  if (isNaN(contentLength) || contentLength <= 0) {
    contentLength = MAX_IMAGE_HEADER_LENGTH;
  }
  return contentLength;
}

function isKnownImageSizeType(
  type: string,
): type is keyof typeof imageSizeTypeToMediaSubType {
  return (
    type in imageSizeTypeToMediaSubType &&
    !!imageSizeTypeToMediaSubType[type as KnownImageSizeType]
  );
}
