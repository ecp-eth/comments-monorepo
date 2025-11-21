import { describe, it, expect, beforeEach, vi } from "vitest";
import fs from "fs";
import path from "path";
import { getVideoMeta } from "../../src/utils/getVideoMeta";

describe("getVideoTracks", () => {
  const fixturesDir = path.join(__dirname, "../services/resolvers/fixtures");
  const mp4Buffer = fs.readFileSync(
    path.join(fixturesDir, "example-video.mp4"),
  );
  const webmBuffer = fs.readFileSync(
    path.join(fixturesDir, "example-video.webm"),
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("successful video track detection", () => {
    it("should get video tracks from MP4 video", async () => {
      const response = new Response(mp4Buffer, {
        status: 200,
        headers: {
          "content-length": mp4Buffer.length.toString(),
          "content-type": "video/mp4",
        },
      });

      const abortController = new AbortController();
      const result = await getVideoMeta(response, abortController);

      if (!result) {
        expect.fail("No result");
      }
      expect(Array.isArray(result.videoTracks)).toBe(true);
      expect(result.videoTracks.length).toBeGreaterThan(0);

      for (const track of result.videoTracks) {
        expect(track).toHaveProperty("dimension");
        expect(track.dimension).toHaveProperty("width");
        expect(track.dimension).toHaveProperty("height");
        expect(track.dimension.width).equal(480);
        expect(track.dimension.height).equal(270);
      }
    });

    it("should get video tracks from WebM video", async () => {
      const response = new Response(webmBuffer, {
        status: 200,
        headers: {
          "content-length": webmBuffer.length.toString(),
          "content-type": "video/webm",
        },
      });

      const abortController = new AbortController();
      const result = await getVideoMeta(response, abortController);

      if (!result) {
        expect.fail("No result");
      }
      expect(Array.isArray(result.videoTracks)).toBe(true);
      expect(result.videoTracks.length).toBeGreaterThan(0);

      for (const track of result.videoTracks) {
        expect(track).toHaveProperty("dimension");
        expect(track.dimension).toHaveProperty("width");
        expect(track.dimension).toHaveProperty("height");
        expect(track.dimension.width).equal(480);
        expect(track.dimension.height).equal(270);
      }
    });

    it("should detect MP4 format by URL extension", async () => {
      const response = {
        ok: true,
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(mp4Buffer);
            controller.close();
          },
        }),
        headers: new Headers({
          "content-length": mp4Buffer.length.toString(),
          "content-type": "application/octet-stream",
        }),
        url: "https://example.com/video.mp4", // ✅ You can set this in a mock object
      } as Response;

      const abortController = new AbortController();
      const result = await getVideoMeta(response, abortController);

      if (!result) {
        expect.fail("No result");
      }
      expect(Array.isArray(result.videoTracks)).toBe(true);
      expect(result.videoTracks.length).toBeGreaterThan(0);
    });

    it("should detect WebM format by content-type header without URL extension", async () => {
      const response = new Response(webmBuffer, {
        status: 200,
        headers: {
          "content-length": webmBuffer.length.toString(),
          "content-type": "video/webm",
        },
      });

      const abortController = new AbortController();
      const result = await getVideoMeta(response, abortController);

      if (!result) {
        expect.fail("No result");
      }
      expect(Array.isArray(result.videoTracks)).toBe(true);
      expect(result.videoTracks.length).toBeGreaterThan(0);
    });

    it("should detect MP4 format by content-type header without URL extension", async () => {
      const response = new Response(mp4Buffer, {
        status: 200,
        headers: {
          "content-length": mp4Buffer.length.toString(),
          "content-type": "video/mp4",
        },
      });

      const abortController = new AbortController();
      const result = await getVideoMeta(response, abortController);

      if (!result) {
        expect.fail("No result");
      }
      expect(Array.isArray(result.videoTracks)).toBe(true);
      expect(result.videoTracks.length).toBeGreaterThan(0);
    });
  });

  describe("error handling", () => {
    it("should return undefined for non-ok response", async () => {
      const response = new Response(null, { status: 404 });

      const abortController = new AbortController();
      const result = await getVideoMeta(response, abortController);

      expect(result).toBeUndefined();
    });

    it("should return undefined for response without body", async () => {
      const response = new Response(null, { status: 200 });

      const abortController = new AbortController();
      const result = await getVideoMeta(response, abortController);

      expect(result).toBeUndefined();
    });

    it("should return undefined for unsupported video format", async () => {
      const response = new Response(mp4Buffer, {
        status: 200,
        headers: {
          "content-length": mp4Buffer.length.toString(),
          "content-type": "video/x-msvideo",
        },
      });

      const abortController = new AbortController();
      const result = await getVideoMeta(response, abortController);

      expect(result).toBeUndefined();
    });

    it("should return undefined when abort controller is already aborted", async () => {
      const response = new Response(mp4Buffer, {
        status: 200,
        headers: {
          "content-length": mp4Buffer.length.toString(),
          "content-type": "video/mp4",
        },
      });

      const abortController = new AbortController();
      abortController.abort();

      const result = await getVideoMeta(response, abortController);

      expect(result).toBeUndefined();
    });
  });

  describe("content-length handling", () => {
    it("should respect MAX_VIDEO_HEADER_LENGTH limit", async () => {
      const largeContentLength = 1024 * 1024; // 1MB
      const MAX_VIDEO_HEADER_LENGTH = 1024 * 300; // 300KB
      const expectedBufferSize = Math.min(
        largeContentLength,
        MAX_VIDEO_HEADER_LENGTH,
      );

      const response = new Response(mp4Buffer, {
        status: 200,
        headers: {
          "content-length": largeContentLength.toString(),
          "content-type": "video/mp4",
        },
      });

      // Mock Buffer.alloc to verify it's called with the correct size limit
      const bufferAllocSpy = vi
        .spyOn(Buffer, "alloc")
        .mockImplementation((size) => {
          // Verify that the buffer size is limited to MAX_VIDEO_HEADER_LENGTH
          expect(size).toBe(expectedBufferSize);
          // Create a real buffer without calling the mocked function
          return Buffer.allocUnsafe(size);
        });

      const abortController = new AbortController();
      const result = await getVideoMeta(response, abortController);

      // Should still work because it limits the buffer size
      if (!result) {
        expect.fail("No result");
      }
      expect(Array.isArray(result.videoTracks)).toBe(true);
      expect(result.videoTracks.length).toBeGreaterThan(0);

      // Verify Buffer.alloc was called with the limited size
      expect(bufferAllocSpy).toHaveBeenCalledWith(expectedBufferSize, 0);

      bufferAllocSpy.mockRestore();
    });

    it("should still manage to return video tracks for invalid content-length", async () => {
      const response = new Response(mp4Buffer, {
        status: 200,
        headers: {
          "content-length": "invalid",
          "content-type": "video/mp4",
        },
      });

      const abortController = new AbortController();
      const result = await getVideoMeta(response, abortController);

      if (!result) {
        expect.fail("No result");
      }
      expect(Array.isArray(result.videoTracks)).toBe(true);
      expect(result.videoTracks.length).toBeGreaterThan(0);

      for (const track of result.videoTracks) {
        expect(track).toHaveProperty("dimension");
        expect(track.dimension).toHaveProperty("width");
        expect(track.dimension).toHaveProperty("height");
        expect(track.dimension.width).equal(480);
        expect(track.dimension.height).equal(270);
      }
    });

    it("should still return result for zero content-length", async () => {
      const response = new Response(mp4Buffer, {
        status: 200,
        headers: {
          "content-length": "0",
          "content-type": "video/mp4",
        },
      });

      const abortController = new AbortController();
      const result = await getVideoMeta(response, abortController);

      if (!result) {
        expect.fail("No result");
      }
      expect(Array.isArray(result.videoTracks)).toBe(true);
      expect(result.videoTracks.length).toBeGreaterThan(0);

      for (const track of result.videoTracks) {
        expect(track).toHaveProperty("dimension");
        expect(track.dimension).toHaveProperty("width");
        expect(track.dimension).toHaveProperty("height");
        expect(track.dimension.width).equal(480);
        expect(track.dimension.height).equal(270);
      }
    });

    it("should still manage to return for negative content-length", async () => {
      const response = new Response(mp4Buffer, {
        status: 200,
        headers: {
          "content-length": "-1",
          "content-type": "video/mp4",
        },
      });

      const abortController = new AbortController();
      const result = await getVideoMeta(response, abortController);

      if (!result) {
        expect.fail("No result");
      }
      expect(Array.isArray(result.videoTracks)).toBe(true);
      expect(result.videoTracks.length).toBeGreaterThan(0);

      for (const track of result.videoTracks) {
        expect(track).toHaveProperty("dimension");
        expect(track.dimension).toHaveProperty("width");
        expect(track.dimension).toHaveProperty("height");
        expect(track.dimension.width).equal(480);
        expect(track.dimension.height).equal(270);
      }
    });

    it("should handle missing content-length header", async () => {
      const response = new Response(mp4Buffer, {
        status: 200,
        headers: {
          "content-type": "video/mp4",
        },
      });

      const abortController = new AbortController();
      const result = await getVideoMeta(response, abortController);

      if (!result) {
        expect.fail("No result");
      }
      expect(Array.isArray(result.videoTracks)).toBe(true);
      expect(result.videoTracks.length).toBeGreaterThan(0);

      for (const track of result.videoTracks) {
        expect(track).toHaveProperty("dimension");
        expect(track.dimension).toHaveProperty("width");
        expect(track.dimension).toHaveProperty("height");
        expect(track.dimension.width).equal(480);
        expect(track.dimension.height).equal(270);
      }
    });
  });
});
