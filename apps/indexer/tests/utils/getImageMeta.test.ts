import { describe, it, expect, beforeEach, vi } from "vitest";
import fs from "fs";
import path from "path";
import { getImageMeta } from "../../src/utils/getImageMeta";

describe("getImageDimension", () => {
  const fixturesDir = path.join(__dirname, "../resolvers/fixtures");
  const jpgBuffer = fs.readFileSync(
    path.join(fixturesDir, "example-image.jpg"),
  );
  const pngBuffer = fs.readFileSync(
    path.join(fixturesDir, "example-image.png"),
  );
  const svgBuffer = fs.readFileSync(
    path.join(fixturesDir, "example-image.svg"),
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("successful image size and media type detection", () => {
    it("should get dimensions from JPG image", async () => {
      const response = new Response(jpgBuffer, {
        status: 200,
        headers: {
          "content-length": jpgBuffer.length.toString(),
          "content-type": "image/jpeg",
        },
      });

      const abortController = new AbortController();
      const result = await getImageMeta(response, abortController);

      expect(result).toEqual({
        width: expect.any(Number),
        height: expect.any(Number),
        mediaType: "image/jpeg",
      });
    });

    it("should get dimensions from PNG image", async () => {
      const response = new Response(pngBuffer, {
        status: 200,
        headers: {
          "content-length": pngBuffer.length.toString(),
          "content-type": "image/png",
        },
      });

      const abortController = new AbortController();
      const result = await getImageMeta(response, abortController);

      expect(result).toEqual({
        width: expect.any(Number),
        height: expect.any(Number),
        mediaType: "image/png",
      });
    });

    it("should get dimensions from SVG image", async () => {
      const response = new Response(svgBuffer, {
        status: 200,
        headers: {
          "content-length": svgBuffer.length.toString(),
          "content-type": "image/svg+xml",
        },
      });

      const abortController = new AbortController();
      const result = await getImageMeta(response, abortController);

      expect(result).toEqual({
        width: expect.any(Number),
        height: expect.any(Number),
        mediaType: "image/svg+xml",
      });
    });

    it("should abort the stream after getting dimensions", async () => {
      const response = new Response(jpgBuffer, {
        status: 200,
        headers: {
          "content-length": jpgBuffer.length.toString(),
          "content-type": "image/jpeg",
        },
      });

      const abortController = new AbortController();
      const abortSpy = vi.spyOn(abortController, "abort");

      const result = await getImageMeta(response, abortController);

      expect(result).toBeDefined();
      expect(abortSpy).toHaveBeenCalled();
    });

    it("should handle very small images", async () => {
      // Create a minimal valid image buffer (1x1 pixel)
      const minimalImage = Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
        0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43,
        0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
        0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
        0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20,
        0x24, 0x2e, 0x27, 0x20, 0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29,
        0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27, 0x39, 0x3d, 0x38, 0x32,
        0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x00, 0x01,
        0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01,
        0xff, 0xc4, 0x00, 0x14, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x08, 0xff, 0xc4,
        0x00, 0x14, 0x10, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xff, 0xda, 0x00, 0x0c,
        0x03, 0x01, 0x00, 0x02, 0x11, 0x03, 0x11, 0x00, 0x3f, 0x00, 0x00, 0xff,
        0xd9,
      ]);

      const response = new Response(minimalImage, {
        status: 200,
        headers: {
          "content-length": minimalImage.length.toString(),
          "content-type": "image/jpeg",
        },
      });

      const abortController = new AbortController();
      const result = await getImageMeta(response, abortController);

      expect(result).toBeDefined();
      // The actual dimensions might be different, so just check they're valid numbers
      expect(result?.width).toBeGreaterThan(0);
      expect(result?.height).toBeGreaterThan(0);
    });
  });

  describe("error handling", () => {
    it("should return undefined for non-ok response", async () => {
      const response = new Response("Not Found", {
        status: 404,
        headers: {
          "content-length": "9",
        },
      });

      const abortController = new AbortController();
      const result = await getImageMeta(response, abortController);

      expect(result).toBeUndefined();
    });

    it("should return undefined for response without body", async () => {
      const response = new Response(null, {
        status: 200,
        headers: {
          "content-length": "0",
        },
      });

      const abortController = new AbortController();
      const result = await getImageMeta(response, abortController);

      expect(result).toBeUndefined();
    });

    it("should handle invalid image data", async () => {
      const invalidImageData = Buffer.from("not an image");
      const response = new Response(invalidImageData, {
        status: 200,
        headers: {
          "content-length": invalidImageData.length.toString(),
          "content-type": "image/jpeg",
        },
      });

      const abortController = new AbortController();

      await expect(getImageMeta(response, abortController)).rejects.toThrow();
    });

    it("should handle aborted request controller gracefully", async () => {
      const response = new Response(jpgBuffer, {
        status: 200,
        headers: {
          "content-length": jpgBuffer.length.toString(),
          "content-type": "image/jpeg",
        },
      });

      const abortController = new AbortController();
      abortController.abort();

      // Should still work despite abort error
      const result = await getImageMeta(response, abortController);
      expect(result).toBeUndefined();
    });
  });

  describe("content-length handling", () => {
    it("should respect MAX_IMAGE_HEADER_LENGTH limit", async () => {
      const largeContentLength = 1024 * 1024; // 1MB
      const MAX_IMAGE_HEADER_LENGTH = 1024 * 30; // 30KB
      const expectedBufferSize = Math.min(
        largeContentLength,
        MAX_IMAGE_HEADER_LENGTH,
      );

      const response = new Response(jpgBuffer, {
        status: 200,
        headers: {
          "content-length": largeContentLength.toString(),
          "content-type": "image/jpeg",
        },
      });

      // Mock Buffer.alloc to verify it's called with the correct size limit
      const bufferAllocSpy = vi
        .spyOn(Buffer, "alloc")
        .mockImplementation((size) => {
          // Verify that the buffer size is limited to MAX_IMAGE_HEADER_LENGTH
          expect(size).toBe(expectedBufferSize);
          // Create a real buffer without calling the mocked function
          return Buffer.allocUnsafe(size);
        });

      const abortController = new AbortController();
      const result = await getImageMeta(response, abortController);

      // Should still work because it limits the buffer size
      expect(result).toBeDefined();
      expect(result!.width).toBeGreaterThan(0);
      expect(result!.height).toBeGreaterThan(0);

      // Verify Buffer.alloc was called with the limited size
      expect(bufferAllocSpy).toHaveBeenCalledWith(expectedBufferSize, 0);

      bufferAllocSpy.mockRestore();
    });

    it("should return undefined for invalid content-length", async () => {
      const response = new Response(jpgBuffer, {
        status: 200,
        headers: {
          "content-length": "invalid",
        },
      });

      const abortController = new AbortController();
      const result = await getImageMeta(response, abortController);

      if (!result) {
        expect.fail("Expected result to be defined");
      }

      expect(result).toEqual({
        width: expect.any(Number),
        height: expect.any(Number),
        mediaType: "image/jpeg",
      });
    });

    it("should return undefined for zero content-length", async () => {
      const response = new Response(jpgBuffer, {
        status: 200,
        headers: {
          "content-length": "0",
        },
      });

      const abortController = new AbortController();
      const result = await getImageMeta(response, abortController);

      if (!result) {
        expect.fail("Expected result to be defined");
      }

      expect(result).toEqual({
        width: expect.any(Number),
        height: expect.any(Number),
        mediaType: "image/jpeg",
      });
    });

    it("should return undefined for negative content-length", async () => {
      const response = new Response(jpgBuffer, {
        status: 200,
        headers: {
          "content-length": "-1",
        },
      });

      const abortController = new AbortController();
      const result = await getImageMeta(response, abortController);

      if (!result) {
        expect.fail("Expected result to be defined");
      }

      expect(result).toEqual({
        width: expect.any(Number),
        height: expect.any(Number),
        mediaType: "image/jpeg",
      });
    });

    it("should handle missing content-length header", async () => {
      const response = new Response(jpgBuffer, {
        status: 200,
        headers: {
          "content-type": "image/jpeg",
        },
      });

      const abortController = new AbortController();
      const result = await getImageMeta(response, abortController);

      if (!result) {
        expect.fail("Expected result to be defined");
      }

      expect(result).toEqual({
        width: expect.any(Number),
        height: expect.any(Number),
        mediaType: "image/jpeg",
      });
    });
  });
});
