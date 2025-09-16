import { Readable } from "stream";
import { ReadableStream } from "stream/web";
import { imageSize } from "image-size";
import { IndexerAPICommentReferenceURLImageSchema } from "@ecp.eth/sdk/indexer";

const sizeSchema = IndexerAPICommentReferenceURLImageSchema.shape.dimension;
// It looks like commonly the image header can be retrieved within 3000 bytes, so we set a default limit of 30000 bytes
// to avoid somebody deliberately forge a response with large content-length to exploit the server
const MAX_IMAGE_HEADER_LENGTH = 3000 * 10;

/**
 * lightweight function to get the dimension of an image from a response,
 * it stops reading the stream immediately after getting the dimension
 * @param response
 * @param requestAbortController the abort controller to abort the underlying request stream
 * @returns
 */
export async function getImageDimension(
  response: Response,
  requestAbortController: AbortController,
): Promise<{ width: number; height: number } | undefined> {
  if (!response.ok || !response.body) {
    return;
  }

  if (requestAbortController.signal.aborted) {
    return;
  }

  const contentLength = parseInt(response.headers.get("content-length") ?? "0");

  if (isNaN(contentLength) || contentLength <= 0) {
    return;
  }

  const stream = Readable.fromWeb(response.body as unknown as ReadableStream);
  const maxHeaderLength = Math.min(contentLength, MAX_IMAGE_HEADER_LENGTH);

  return new Promise((resolve, reject) => {
    const buffer = Buffer.alloc(maxHeaderLength, 0);
    let size: { width: number; height: number } | undefined;
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
        size = imageSize(buffer);
      } catch (err) {
        // imageSize fails if the buffer is not enough for getting the image dimension
        // so we just record the last error thrown, in the end if no size found then we throw the last error
        imageSizeError = err;
        return;
      }

      if (size) {
        try {
          requestAbortController.abort();
        } catch (err) {
          console.error("abort throws", err);
        }
      }
    });

    const handleErrorOrEnd = (err: unknown = imageSizeError) => {
      if (size) {
        // the error callback can be triggered due to aborting the controller
        console.log("length retrieved so far", offset);
        resolve(sizeSchema.parse(size));
        return;
      }

      reject(err ?? new Error("Failed to get image dimension"));
    };

    stream.on("error", handleErrorOrEnd);
    stream.on("end", handleErrorOrEnd);
  });
}
