import { Readable } from "stream";
import { type ReadableStream } from "stream/web";
import { Input, StreamSource, MP4, WEBM } from "mediabunny";

const MAX_VIDEO_HEADER_LENGTH = 1024 * 300;

enum VideoContainerType {
  MP4 = "mp4",
  WEBM = "webm",
  UNKNOWN = "unknown",
}

export interface VideoTrack {
  dimension: {
    width: number;
    height: number;
  };
  codec?: string;
}

export async function getVideoMeta(
  response: Response,
  requestAbortController: AbortController,
): Promise<
  | {
      videoTracks: VideoTrack[];
    }
  | undefined
> {
  const containerType = isMP4(response)
    ? VideoContainerType.MP4
    : isWebM(response)
      ? VideoContainerType.WEBM
      : VideoContainerType.UNKNOWN;

  if (containerType === VideoContainerType.UNKNOWN) {
    return;
  }

  if (!response.ok || !response.body) {
    return;
  }

  if (requestAbortController.signal.aborted) {
    return;
  }

  let contentLength = parseInt(response.headers.get("content-length") ?? "");

  if (isNaN(contentLength) || contentLength <= 0) {
    contentLength = MAX_VIDEO_HEADER_LENGTH;
  }

  const stream = Readable.fromWeb(response.body as unknown as ReadableStream);
  const maxHeaderLength = Math.min(contentLength, MAX_VIDEO_HEADER_LENGTH);

  return new Promise((resolve, reject) => {
    let videoTracks: VideoTrack[] | undefined;
    let mediaBunnyError: unknown;
    let offset = 0;
    const buffer = Buffer.alloc(maxHeaderLength, 0);

    // Create StreamSource for mediabunny
    const streamSource = new StreamSource({
      getSize: () => buffer.length,
      read: (start: number, end: number) => {
        return buffer.subarray(start, end);
      },
    });

    // Create input with appropriate formats
    // theoratically we can support all formats, but let's test with the most common ones to start with
    const formats = containerType === VideoContainerType.MP4 ? [MP4] : [WEBM];

    // Test for tracks as we receive data
    stream.on("data", async (chunk) => {
      if (!Buffer.isBuffer(chunk)) {
        return;
      }

      if (offset > maxHeaderLength) {
        requestAbortController.abort();
        return;
      }

      // Copy chunk to buffer
      chunk.copy(buffer, offset);
      offset += chunk.length;

      try {
        // Try to get tracks with current buffer data
        const input = new Input({
          source: streamSource,
          formats,
        });
        const tracks = await input.getTracks();

        // Check if we have video tracks
        const videoTracksList: VideoTrack[] = [];
        for (const track of tracks) {
          if (track.isVideoTrack()) {
            videoTracksList.push({
              dimension: {
                width: track.displayWidth,
                height: track.displayHeight,
              },
              codec: track.codec ?? undefined,
              // duration sometimes requires downloading the whole video it seems which is too much load on the indexer
              // let's skip it for now
              // duration: track.computedDuration()
            });
          }
        }

        if (videoTracksList.length > 0) {
          videoTracks = videoTracksList;
          requestAbortController.abort();
        }
      } catch (err) {
        // mediabunny might fail if the buffer is not enough for getting the video metadata
        // so we just record the last error thrown
        mediaBunnyError = err;
      }
    });

    const handleErrorOrEnd = (err: unknown = mediaBunnyError) => {
      if (videoTracks) {
        // The error callback can be triggered due to aborting the controller
        resolve({ videoTracks });
        return;
      }

      reject(err ?? new GetVideoTracksError("Failed to get video tracks"));
    };

    stream.on("error", handleErrorOrEnd);
    stream.on("end", handleErrorOrEnd);
  });
}

function isMP4(response: Response): boolean {
  return (
    response.url.endsWith(".mp4") ||
    (response.headers.get("content-type")?.includes("video/mp4") ?? false)
  );
}

function isWebM(response: Response): boolean {
  return (
    response.url.endsWith(".webm") ||
    (response.headers.get("content-type")?.includes("video/webm") ?? false)
  );
}

export class GetVideoTracksError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GetVideoTracksError";
  }
}
