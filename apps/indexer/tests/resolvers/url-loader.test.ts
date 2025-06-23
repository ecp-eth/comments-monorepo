import { describe, it, expect, beforeEach } from "vitest";
import nock from "nock";
import {
  urlResolver,
  createURLResolver,
} from "../../src/resolvers/url-resolver";

nock.disableNetConnect();

describe("url loader", () => {
  beforeEach(() => {
    nock.cleanAll();
    urlResolver.clearAll();
  });

  it("resolves image url", async () => {
    nock("https://example.com").get("/").reply(200, "", {
      "content-type": "image/png",
    });

    const result = await urlResolver.load("https://example.com");

    expect(result).toEqual({
      type: "image",
      url: "https://example.com/",
      mediaType: "image/png",
    });
  });

  it("resolves video url", async () => {
    nock("https://example.com").get("/").reply(200, "", {
      "content-type": "video/mp4",
    });

    const result = await urlResolver.load("https://example.com");

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

    const result = await urlResolver.load("https://example.com");

    expect(result).toEqual({
      type: "file",
      url: "https://example.com/",
      mediaType: "application/pdf",
    });
  });

  it("treats any other url as file", async () => {
    nock("https://example.com").get("/").reply(200, "");

    const result = await urlResolver.load("https://example.com");

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

    const result = await urlResolver.load("https://example.com");

    expect(result).toEqual({
      type: "file",
      url: "https://example.com/redirected",
      mediaType: "application/octet-stream",
    });
  });

  it("returns null if response is not ok", async () => {
    nock("https://example.com").get("/").reply(404);

    const result = await urlResolver.load("https://example.com");

    expect(result).toBeNull();
  });

  describe("webpage", () => {
    it("resolves webpage without og data", async () => {
      nock("https://example.com")
        .get("/")
        .reply(200, "<html><title>Hello</title><body>Hello</body></html>", {
          "content-type": "text/html",
        });

      const result = await urlResolver.load("https://example.com");

      expect(result).toEqual({
        type: "webpage",
        url: "https://example.com/",
        title: "Hello",
        description: null,
        favicon: null,
        opengraph: null,
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

      const result = await urlResolver.load("https://example.com");

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

      const result = await urlResolver.load("https://example.com");

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

      const result = await urlResolver.load("https://example.com");

      expect(result).toEqual({
        type: "webpage",
        url: "https://example.com/",
        favicon: "https://example.com/favicon.ico",
        title: "Hello",
        description: null,
        opengraph: null,
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

      const result = await urlResolver.load("https://example.com");

      expect(result).toEqual({
        type: "webpage",
        url: "https://example.com/",
        favicon: "https://example.com/favicon.ico",
        title: "Hello",
        description: null,
        opengraph: null,
      });
    });
  });

  it("respects timeout", async () => {
    const resolver = createURLResolver({ timeout: 200 });

    nock("https://example.com").get("/").delay(300).reply(200, "");

    await expect(resolver.load("https://example.com")).rejects.toThrow(
      "The operation was aborted due to timeout",
    );
  });
});
