import { describe, it } from "node:test";
import assert from "node:assert";
import { IndexerAPICommentReferencesSchema } from "../schemas.js";

const position = {
  start: 0,
  end: 100,
};

describe("IndexerAPICommentReferencesSchema", () => {
  it("should parse an array of references", () => {
    const commentReferences = [
      {
        position,
        type: "video",
        url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        mediaType: "video/mp4",
      },
      {
        position,
        type: "image",
        url: "https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png",
        mediaType: "image/png",
      },
      {
        position,
        type: "webpage",
        url: "https://www.google.com",
        title: "Google",
        description: "Google is a search engine",
        favicon: "https://www.google.com/favicon.ico",
        opengraph: {
          title: "Google",
          description: "Google is a search engine",
          image:
            "https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png",
          url: "https://www.google.com",
        },
      },
      {
        position,
        type: "file",
        url: "https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png",
        mediaType: "image/png",
      },
    ];

    const parsed =
      IndexerAPICommentReferencesSchema.safeParse(commentReferences);

    if (!parsed.success) {
      console.error(JSON.stringify(parsed.error, null, 2));
    }

    assert.ok(parsed.success);
    assert.deepStrictEqual(parsed.data, commentReferences);
  });

  it("should avoid any invalid reference", () => {
    const commentReferences = [
      {
        position,
        type: "video",
        url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        mediaType: "video/mp4",
      },
      {
        position,
        type: "image",
        url: "https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png",
        mediaType: "image/png",
      },
      {
        position,
        type: "webpage",
        url: "https://www.google.com",
        title: "Google",
        description: "Google is a search engine",
        favicon: "https://www.google.com/favicon.ico",
        opengraph: {
          title: "Google",
          description: "Google is a search engine",
          image: "/not-a-url",
          url: "https://www.google.com",
        },
      },
      {
        position,
        type: "file",
        url: "https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png",
        mediaType: "image/png",
      },
    ];

    const parsed =
      IndexerAPICommentReferencesSchema.safeParse(commentReferences);

    if (!parsed.success) {
      console.error(JSON.stringify(parsed.error, null, 2));
    }

    assert.ok(parsed.success);
    assert.deepStrictEqual(parsed.data, [
      {
        position,
        type: "video",
        url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        mediaType: "video/mp4",
      },
      {
        position,
        type: "image",
        url: "https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png",
        mediaType: "image/png",
      },
      {
        position,
        type: "file",
        url: "https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png",
        mediaType: "image/png",
      },
    ]);
  });
});
