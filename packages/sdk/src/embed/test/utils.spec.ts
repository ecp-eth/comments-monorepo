import { describe, expect, it } from "vitest";
import { createCommentsEmbedURL, parseCommentsEmbedConfig } from "../utils.js";

describe("embed config serialization", () => {
  it("serializes and deserializes reactions config", () => {
    const config = {
      app: "all" as const,
      chainId: 8453 as const,
      channelId: 123n,
      reactions: [
        { value: "like", icon: "heart" },
        { value: "repost", icon: "repost" },
        { value: "fire", icon: "🔥" },
        { value: "gm", icon: "hand-wave" },
      ],
      theme: {
        colors: {
          light: {
            primary: "#111111",
          },
        },
      },
    };

    const url = createCommentsEmbedURL({
      embedUri: "https://embed.ethcomments.xyz",
      source: { targetUri: "https://example.com/post-1" },
      config,
    });

    const compressedConfig = new URL(url).searchParams.get("config");

    expect(compressedConfig).toBeTruthy();

    const parsedConfig = compressedConfig
      ? parseCommentsEmbedConfig(compressedConfig)
      : undefined;

    expect(parsedConfig).toBeDefined();
    expect(parsedConfig?.reactions).toStrictEqual(config.reactions);
    expect(parsedConfig?.theme?.colors?.light?.primary).toBe("#111111");
    expect(parsedConfig?.channelId).toBe(123n);
  });
});
