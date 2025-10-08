import { describe, it, expect, beforeEach } from "vitest";
import nock from "nock";
import fs from "fs";
import path from "path";
import { createHTTPResolver } from "../../src/resolvers/http-resolver";
import { Readable } from "stream";

nock.disableNetConnect();

describe("url loader", () => {
  const httpResolver = createHTTPResolver();
  const jpgBuffer = fs.readFileSync(
    path.join(__dirname, "fixtures", "example-image.jpg"),
  );
  const pngBuffer = fs.readFileSync(
    path.join(__dirname, "fixtures", "example-image.png"),
  );
  const svgBuffer = fs.readFileSync(
    path.join(__dirname, "fixtures", "example-image.svg"),
  );

  beforeEach(() => {
    nock.cleanAll();
    httpResolver.clearAll();
  });

  it("resolves image url", async () => {
    nock("https://example.com").get("/").reply(200, jpgBuffer, {
      "content-type": "image/jpeg",
      "content-length": jpgBuffer.length.toString(),
    });

    const result = await httpResolver.load("https://example.com");

    expect(result).toEqual({
      type: "image",
      url: "https://example.com/",
      mediaType: "image/jpeg",
      dimension: {
        width: 5067,
        height: 1865,
      },
    });
  });

  it("resolves jpg image url with slow image data", async () => {
    // with a slow image stream, it will cause the getImageSize to abort the request to save time
    nock("https://example.com")
      .get("/example-image.jpg")
      .reply(200, createSlowStream(jpgBuffer), {
        "content-type": "image/jpeg",
        "content-length": jpgBuffer.length.toString(),
      });

    const result = await httpResolver.load(
      "https://example.com/example-image.jpg",
    );

    expect(result).toEqual({
      type: "image",
      url: "https://example.com/example-image.jpg",
      mediaType: "image/jpeg",
      dimension: {
        width: 5067,
        height: 1865,
      },
    });
  });

  it("resolves png image url with slow image data", async () => {
    // with a slow image stream, it will cause the getImageSize to abort the request to save time
    nock("https://example.com")
      .get("/example-image.png")
      .reply(200, createSlowStream(pngBuffer), {
        "content-type": "image/png",
        "content-length": pngBuffer.length.toString(),
      });

    const result = await httpResolver.load(
      "https://example.com/example-image.png",
    );

    expect(result).toEqual({
      type: "image",
      url: "https://example.com/example-image.png",
      mediaType: "image/png",
      dimension: {
        width: 5067,
        height: 1865,
      },
    });
  });

  it("resolves svg image url with slow image data", async () => {
    // with a slow image stream, it will cause the getImageSize to abort the request to save time
    nock("https://example.com")
      .get("/example-image.svg")
      .reply(200, createSlowStream(svgBuffer), {
        "content-type": "image/svg+xml",
        "content-length": svgBuffer.length.toString(),
      });

    const result = await httpResolver.load(
      "https://example.com/example-image.svg",
    );

    expect(result).toEqual({
      type: "image",
      url: "https://example.com/example-image.svg",
      mediaType: "image/svg+xml",
      dimension: {
        width: 5067,
        height: 1865,
      },
    });
  });

  it("resolves video url", async () => {
    nock("https://example.com").get("/").reply(200, "", {
      "content-type": "video/mp4",
    });

    const result = await httpResolver.load("https://example.com");

    expect(result).toEqual({
      type: "video",
      url: "https://example.com/",
      mediaType: "video/mp4",
    });
  });

  it("resolves file url", async () => {
    nock("https://example.com").get("/").reply(200, "", {
      "content-type": "application/pdf",
    });

    const result = await httpResolver.load("https://example.com");

    expect(result).toEqual({
      type: "file",
      url: "https://example.com/",
      mediaType: "application/pdf",
    });
  });

  it("treats any other url as file", async () => {
    nock("https://example.com").get("/").reply(200, "");

    const result = await httpResolver.load("https://example.com");

    expect(result).toEqual({
      type: "file",
      url: "https://example.com/",
      mediaType: "application/octet-stream",
    });
  });

  it("respects redirects and returns the final url", async () => {
    nock("https://example.com")
      .get("/")
      .reply(302, "", {
        location: "https://example.com/redirected",
      })
      .get("/redirected")
      .reply(200, "");

    const result = await httpResolver.load("https://example.com");

    expect(result).toEqual({
      type: "file",
      url: "https://example.com/redirected",
      mediaType: "application/octet-stream",
    });
  });

  // unauthorized
  it("returns null if response is 401", async () => {
    nock("https://example.com").get("/").reply(401);

    const result = await httpResolver.load("https://example.com");

    expect(result).toBeNull();
  });

  // forbidden
  it("returns null if response is 403", async () => {
    nock("https://example.com").get("/").reply(403);

    const result = await httpResolver.load("https://example.com");

    expect(result).toBeNull();
  });

  // not found
  it("returns null if response is 404", async () => {
    nock("https://example.com").get("/").reply(404);

    const result = await httpResolver.load("https://example.com");

    expect(result).toBeNull();
  });

  // permanently gone
  it("returns null if response is 410", async () => {
    nock("https://example.com").get("/").reply(410);

    const result = await httpResolver.load("https://example.com");

    expect(result).toBeNull();
  });

  it("throws an error if response is not 200, 401, 403, or 404", async () => {
    nock("https://example.com").get("/").reply(500);

    await expect(async () => {
      await httpResolver.load("https://example.com");
    }).rejects.toThrow(expect.any(Error));
  });

  describe("webpage", () => {
    it("resolves webpage without og data", async () => {
      nock("https://example.com")
        .get("/")
        .reply(200, "<html><title>Hello</title><body>Hello</body></html>", {
          "content-type": "text/html",
        });

      const result = await httpResolver.load("https://example.com");

      expect(result).toEqual({
        type: "webpage",
        url: "https://example.com/",
        title: "Hello",
        description: null,
        favicon: null,
        opengraph: null,
        mediaType: "text/html",
      });
    });

    it("resolves webpage with og data", async () => {
      nock("https://example.com")
        .get("/")
        .reply(
          200,
          `<html>
        <title>Hello</title>
        <meta property='og:title' content='Hello'>
        <meta property='og:description' content='Description'>
        <meta property='og:image' content='https://example.com/image.png'>
        <meta property='og:url' content='https://example.com/'>
        <body>Hello</body>
        </html>`,
          {
            "content-type": "text/html",
          },
        );

      const result = await httpResolver.load("https://example.com");

      expect(result).toEqual({
        type: "webpage",
        url: "https://example.com/",
        title: "Hello",
        opengraph: {
          title: "Hello",
          description: "Description",
          image: "https://example.com/image.png",
          url: "https://example.com/",
        },
        description: "Description",
        favicon: null,
        mediaType: "text/html",
      });
    });

    it("resolves webpage with og data and meta data", async () => {
      nock("https://example.com")
        .get("/")
        .reply(
          200,
          `<html>
        <title>Hello</title>
        <meta name='description' content='Description'>
        <meta property='og:title' content='Hello'>
        <meta property='og:description' content='Og Description'>
        <meta property='og:image' content='https://example.com/image.png'>
        <meta property='og:url' content='https://example.com/'>
        <body>Hello</body>
        </html>`,
          {
            "content-type": "text/html",
          },
        );

      const result = await httpResolver.load("https://example.com");

      expect(result).toEqual({
        type: "webpage",
        url: "https://example.com/",
        title: "Hello",
        opengraph: {
          title: "Hello",
          description: "Og Description",
          image: "https://example.com/image.png",
          url: "https://example.com/",
        },
        description: "Description",
        favicon: null,
        mediaType: "text/html",
      });
    });

    it("resolves webpage with relative image path in og data", async () => {
      nock("https://example.com")
        .get("/")
        .reply(
          200,
          `<html>
        <title>Hello</title>
        <meta name='description' content='Description'>
        <meta property='og:title' content='Hello'>
        <meta property='og:description' content='Og Description'>
        <meta property='og:image' content='/image.png'>
        <meta property='og:url' content='https://example.com/'>
        <body>Hello</body>
        </html>`,
          {
            "content-type": "text/html",
          },
        );

      const result = await httpResolver.load("https://example.com");

      expect(result).toEqual({
        type: "webpage",
        url: "https://example.com/",
        title: "Hello",
        opengraph: {
          title: "Hello",
          description: "Og Description",
          image: "https://example.com/image.png",
          url: "https://example.com/",
        },
        description: "Description",
        favicon: null,
        mediaType: "text/html",
      });
    });

    it("resolves fully qualified favicon", async () => {
      nock("https://example.com")
        .get("/")
        .reply(
          200,
          `<html><title>Hello</title><link rel='icon' href='https://example.com/favicon.ico'></html>`,
          {
            "content-type": "text/html",
          },
        );

      const result = await httpResolver.load("https://example.com");

      expect(result).toEqual({
        type: "webpage",
        url: "https://example.com/",
        favicon: "https://example.com/favicon.ico",
        title: "Hello",
        description: null,
        opengraph: null,
        mediaType: "text/html",
      });
    });

    it("resolves relative favicon", async () => {
      nock("https://example.com")
        .get("/")
        .reply(
          200,
          `<html><title>Hello</title><link rel='icon' href='/favicon.ico'></html>`,
          {
            "content-type": "text/html",
          },
        );

      const result = await httpResolver.load("https://example.com");

      expect(result).toEqual({
        type: "webpage",
        url: "https://example.com/",
        favicon: "https://example.com/favicon.ico",
        title: "Hello",
        description: null,
        opengraph: null,
        mediaType: "text/html",
      });
    });
  });

  it("respects timeout", async () => {
    const resolver = createHTTPResolver({ timeout: 200 });

    nock("https://example.com").get("/").delay(300).reply(200, "");

    await expect(resolver.load("https://example.com")).rejects.toThrow(
      "The operation was aborted due to timeout",
    );
  });
});

function createSlowStream(buffer: Buffer, chunkSize = 2048, delay = 10) {
  let offset = 0;

  return new Readable({
    read() {
      if (offset >= buffer.length) {
        this.push(null); // end of stream
        return;
      }

      const chunk = buffer.subarray(offset, offset + chunkSize);
      offset += chunkSize;

      // simulate async delay
      setTimeout(() => {
        this.push(chunk);
      }, delay);
    },
  });
}
