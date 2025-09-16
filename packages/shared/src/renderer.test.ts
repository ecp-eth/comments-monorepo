import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { renderToReact } from "./renderer.js";
import { renderToMarkdown } from "./renderer.js";

describe("renderToReact", () => {
  it("render empty content", () => {
    const result = renderToReact({
      content: "",
      references: [],
    });

    expect(result.mediaReferences).toEqual([]);
    expect(renderToStaticMarkup(result.element)).toBe("");
  });

  it("renders basic text", () => {
    const result = renderToReact({
      content: "Hello, world!",
      references: [],
    });

    expect(result.mediaReferences).toEqual([]);
    expect(renderToStaticMarkup(result.element)).toBe("<p>Hello, world!</p>");
  });

  it("renders paragraphs", () => {
    const result = renderToReact({
      content: "Par 1\nPar2\n\n\nPar3",
      references: [],
    });

    expect(result.mediaReferences).toEqual([]);
    expect(renderToStaticMarkup(result.element)).toBe(
      "<p>Par 1</p><p>Par2</p><p>Par3</p>",
    );
  });

  it("renders references properly", () => {
    const result = renderToReact({
      content:
        "Test 0x225f137127d9067788314bc7fcc1f36746a3c3B5 @0x78397D9D185D3a57D01213CBe3Ec1EbAC3EEc77d $USDC",
      references: [
        {
          type: "ens",
          url: "https://app.ens.domains/0x225f137127d9067788314bc7fcc1f36746a3c3B5",
          avatarUrl:
            "https://ipfs.io/ipfs/bafkreifnrjhkl7ccr2ifwn2n7ap6dh2way25a6w5x2szegvj5pt4b5nvfu",
          name: "luc.eth",
          address: "0x225f137127d9067788314bc7fcc1f36746a3c3B5",
          position: {
            start: 5,
            end: 47,
          },
        },
        {
          type: "farcaster",
          address: "0x78397D9D185D3a57D01213CBe3Ec1EbAC3EEc77d",
          fid: 341794,
          fname: "mskr.fcast.id",
          url: "https://farcaster.xyz/mskr",
          username: "mskr",
          displayName: "mskr",
          pfpUrl: "https://i.imgur.com/DyoLsDd.jpg",
          position: {
            start: 48,
            end: 91,
          },
        },
      ],
    });

    expect(result.mediaReferences).toEqual([]);
    expect(renderToStaticMarkup(result.element)).toBe(
      '<p>Test <a class="text-blue-500" href="https://app.ens.domains/0x225f137127d9067788314bc7fcc1f36746a3c3B5" rel="noopener noreferrer" target="_blank">@luc.eth</a> <a class="text-blue-500" href="https://farcaster.xyz/mskr" rel="noopener noreferrer" target="_blank">@mskr.fcast.id</a> $USDC</p>',
    );
  });

  it("correctly renders unicode characters", () => {
    const result = renderToReact({
      content:
        "👀 what is 🎶 luc.eth this $USDC 💻   @0x78397D9D185D3a57D01213CBe3Ec1EbAC3EEc77d.",
      references: [
        {
          type: "ens",
          address: "0x225f137127d9067788314bc7fcc1f36746a3c3B5",
          name: "luc.eth",
          avatarUrl:
            "https://ipfs.io/ipfs/bafkreifnrjhkl7ccr2ifwn2n7ap6dh2way25a6w5x2szegvj5pt4b5nvfu",
          url: "https://app.ens.domains/luc.eth",
          position: {
            start: 14,
            end: 21,
          },
        },
        {
          type: "erc20",
          address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
          name: "USD Coin",
          symbol: "USDC",
          logoURI:
            "https://tokens.1inch.io/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png",
          decimals: 6,
          chainId: null,
          chains: [
            {
              caip: "eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
              chainId: 1,
            },
          ],
          position: {
            start: 27,
            end: 32,
          },
        },
        {
          type: "farcaster",
          fid: 341794,
          fname: "mskr.fcast.id",
          address: "0x78397D9D185D3a57D01213CBe3Ec1EbAC3EEc77d",
          url: "https://farcaster.xyz/mskr",
          username: "mskr",
          displayName: "mskr",
          pfpUrl: "https://i.imgur.com/DyoLsDd.jpg",
          position: {
            start: 38,
            end: 81,
          },
        },
      ],
    });

    expect(result.mediaReferences).toEqual([]);
    expect(renderToStaticMarkup(result.element)).toBe(
      '<p>👀 what is 🎶 <a class="text-blue-500" href="https://app.ens.domains/luc.eth" rel="noopener noreferrer" target="_blank">@luc.eth</a> this <span class="text-blue-500" title="USD Coin">$USDC</span> 💻   <a class="text-blue-500" href="https://farcaster.xyz/mskr" rel="noopener noreferrer" target="_blank">@mskr.fcast.id</a>.</p>',
    );
  });

  it("renders urls", () => {
    const result = renderToReact({
      content: "🌎 https://example.com/test 💻 @luc.eth http://localhost:3000",
      references: [
        {
          type: "ens",
          address: "0x225f137127d9067788314bc7fcc1f36746a3c3B5",
          name: "luc.eth",
          avatarUrl:
            "https://ipfs.io/ipfs/bafkreifnrjhkl7ccr2ifwn2n7ap6dh2way25a6w5x2szegvj5pt4b5nvfu",
          url: "https://app.ens.domains/luc.eth",
          position: {
            start: 31,
            end: 39,
          },
        },
      ],
    });

    expect(result.mediaReferences).toEqual([]);
    expect(renderToStaticMarkup(result.element)).toBe(
      '<p>🌎 <a class="underline" href="https://example.com/test" rel="noopener noreferrer" target="_blank">https://example.com/test</a> 💻 <a class="text-blue-500" href="https://app.ens.domains/luc.eth" rel="noopener noreferrer" target="_blank">@luc.eth</a> <a class="underline" href="http://localhost:3000" rel="noopener noreferrer" target="_blank">http://localhost:3000</a></p>',
    );
  });

  it("removes last urls that have reference and the reference is the one we want to render separately", () => {
    const result = renderToReact({
      content:
        "👀 what is 🎶 luc.eth this $USDC 💻   @0x78397D9D185D3a57D01213CBe3Ec1EbAC3EEc77d.\nhttp://donthavereference.tld\nhttp://image.tld\nhttp://video.tld",
      references: [
        {
          type: "ens",
          address: "0x225f137127d9067788314bc7fcc1f36746a3c3B5",
          name: "luc.eth",
          avatarUrl:
            "https://ipfs.io/ipfs/bafkreifnrjhkl7ccr2ifwn2n7ap6dh2way25a6w5x2szegvj5pt4b5nvfu",
          url: "https://app.ens.domains/luc.eth",
          position: {
            start: 14,
            end: 21,
          },
        },
        {
          type: "erc20",
          address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
          name: "USD Coin",
          symbol: "USDC",
          logoURI:
            "https://tokens.1inch.io/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png",
          decimals: 6,
          chainId: null,
          chains: [
            {
              caip: "eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
              chainId: 1,
            },
          ],
          position: {
            start: 27,
            end: 32,
          },
        },
        {
          type: "farcaster",
          fid: 341794,
          fname: "mskr.fcast.id",
          address: "0x78397D9D185D3a57D01213CBe3Ec1EbAC3EEc77d",
          url: "https://farcaster.xyz/mskr",
          username: "mskr",
          displayName: "mskr",
          pfpUrl: "https://i.imgur.com/DyoLsDd.jpg",
          position: {
            start: 38,
            end: 81,
          },
        },
        {
          type: "image",
          mediaType: "image/png",
          position: {
            start: 112,
            end: 128,
          },
          url: "http://image.tld",
        },
        {
          type: "video",
          mediaType: "video/mp4",
          position: {
            start: 129,
            end: 145,
          },
          url: "http://video.tld",
        },
      ],
    });

    expect(result.mediaReferences).toEqual([
      {
        type: "image",
        mediaType: "image/png",
        position: { start: 112, end: 128 },
        url: "http://image.tld",
      },
      {
        type: "video",
        mediaType: "video/mp4",
        position: { start: 129, end: 145 },
        url: "http://video.tld",
      },
    ]);

    expect(renderToStaticMarkup(result.element)).toBe(
      '<p>👀 what is 🎶 <a class="text-blue-500" href="https://app.ens.domains/luc.eth" rel="noopener noreferrer" target="_blank">@luc.eth</a> this <span class="text-blue-500" title="USD Coin">$USDC</span> 💻   <a class="text-blue-500" href="https://farcaster.xyz/mskr" rel="noopener noreferrer" target="_blank">@mskr.fcast.id</a>.</p><p><a class="underline" href="http://donthavereference.tld" rel="noopener noreferrer" target="_blank">http://donthavereference.tld</a></p>',
    );
  });

  it("works correctly just with text and uploaded file", () => {
    const result = renderToReact({
      content:
        "Test\nhttps://amber-electoral-takin-876.mypinata.cloud/ipfs/bafybeihnltvyg5fgrvvqdszx6skfpkmg4hjtumj4gdn7wdwjba2uxnzsgu",
      references: [
        {
          type: "image",
          mediaType: "image/png",
          position: {
            start: 5,
            end: 118,
          },
          url: "https://amber-electoral-takin-876.mypinata.cloud/ipfs/bafybeihnltvyg5fgrvvqdszx6skfpkmg4hjtumj4gdn7wdwjba2uxnzsgu",
        },
      ],
    });

    expect(result.mediaReferences).toEqual([
      {
        type: "image",
        mediaType: "image/png",
        position: { start: 5, end: 118 },
        url: "https://amber-electoral-takin-876.mypinata.cloud/ipfs/bafybeihnltvyg5fgrvvqdszx6skfpkmg4hjtumj4gdn7wdwjba2uxnzsgu",
      },
    ]);
    expect(renderToStaticMarkup(result.element)).toBe("<p>Test</p>");
  });

  describe("truncation", () => {
    it("truncates by maxLength considering rendered text", () => {
      const result = renderToReact({
        content: "Hello @luc.eth world!",
        references: [
          {
            type: "ens",
            address: "0x225f137127d9067788314bc7fcc1f36746a3c3B5",
            name: "luc.eth",
            avatarUrl: "https://example.com/avatar.jpg",
            url: "https://app.ens.domains/luc.eth",
            position: {
              start: 6,
              end: 14,
            },
          },
        ],
        maxLength: 15, // "Hello @luc.eth " = 15 characters
      });

      expect(result.isTruncated).toBe(true);
      expect(renderToStaticMarkup(result.element)).toBe(
        '<p>Hello <a class="text-blue-500" href="https://app.ens.domains/luc.eth" rel="noopener noreferrer" target="_blank">@luc.eth</a>...</p>',
      );
    });

    it("truncates by maxLength with regular text", () => {
      const result = renderToReact({
        content: "This is a very long text that should be truncated",
        references: [],
        maxLength: 20,
      });

      expect(result.isTruncated).toBe(true);
      expect(renderToStaticMarkup(result.element)).toBe(
        "<p>This is a very long...</p>",
      );
    });

    it("truncates by maxLength with URLs", () => {
      const result = renderToReact({
        content: "Check this link: https://example.com/very-long-url",
        references: [],
        maxLength: 25, // "Check this link: https://" = 25 characters
      });

      expect(result.isTruncated).toBe(true);
      expect(renderToStaticMarkup(result.element)).toBe(
        "<p>Check this link:...</p>",
      );
    });

    it("truncates by maxLines", () => {
      const result = renderToReact({
        content: "Line 1\nLine 2\nLine 3\nLine 4",
        references: [],
        maxLines: 2,
      });

      expect(result.isTruncated).toBe(true);
      expect(renderToStaticMarkup(result.element)).toBe(
        "<p>Line 1</p><p>Line 2</p>",
      );
    });

    it("truncates by maxLines with references", () => {
      const result = renderToReact({
        content: "Line 1 with @luc.eth\nLine 2 with $USDC\nLine 3\nLine 4",
        references: [
          {
            type: "ens",
            address: "0x225f137127d9067788314bc7fcc1f36746a3c3B5",
            name: "luc.eth",
            avatarUrl: "https://example.com/avatar.jpg",
            url: "https://app.ens.domains/luc.eth",
            position: {
              start: 12,
              end: 20,
            },
          },
          {
            type: "erc20",
            address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
            name: "USD Coin",
            symbol: "USDC",
            logoURI: "https://example.com/usdc.png",
            decimals: 6,
            chainId: null,
            chains: [
              {
                caip: "eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
                chainId: 1,
              },
            ],
            position: {
              start: 33,
              end: 38,
            },
          },
        ],
        maxLines: 2,
      });

      expect(result.isTruncated).toBe(true);
      expect(renderToStaticMarkup(result.element)).toBe(
        '<p>Line 1 with <a class="text-blue-500" href="https://app.ens.domains/luc.eth" rel="noopener noreferrer" target="_blank">@luc.eth</a></p><p>Line 2 with <span class="text-blue-500" title="USD Coin">$USDC</span></p>',
      );
    });

    it("respects both maxLength and maxLines", () => {
      const result = renderToReact({
        content:
          "Very long line that exceeds the length limit\nShort line\nAnother line",
        references: [],
        maxLength: 20,
        maxLines: 2,
      });

      expect(result.isTruncated).toBe(true);
      expect(renderToStaticMarkup(result.element)).toBe(
        "<p>Very long line that...</p>",
      );
    });

    it("does not truncate when limits are not exceeded", () => {
      const result = renderToReact({
        content: "Short text",
        references: [],
        maxLength: 100,
        maxLines: 10,
      });

      expect(result.isTruncated).toBe(false);
      expect(renderToStaticMarkup(result.element)).toBe("<p>Short text</p>");
    });

    it("handles truncation with mixed content types", () => {
      const result = renderToReact({
        content: "Hello @luc.eth! Check https://example.com and $USDC",
        references: [
          {
            type: "ens",
            address: "0x225f137127d9067788314bc7fcc1f36746a3c3B5",
            name: "luc.eth",
            avatarUrl: "https://example.com/avatar.jpg",
            url: "https://app.ens.domains/luc.eth",
            position: {
              start: 6,
              end: 14,
            },
          },
          {
            type: "webpage",
            position: {
              start: 22,
              end: 41,
            },
            url: "https://example.com",
            title: "Example",
            description: "Example description",
            favicon: null,
            opengraph: null,
            mediaType: "text/html",
          },
          {
            type: "erc20",
            address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
            name: "USD Coin",
            symbol: "USDC",
            logoURI: "https://example.com/usdc.png",
            decimals: 6,
            chainId: null,
            chains: [
              {
                caip: "eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
                chainId: 1,
              },
            ],
            position: {
              start: 46,
              end: 51,
            },
          },
        ],
        maxLength: 42, // "Hello @luc.eth! Check https://example.com " = 42 characters
      });

      expect(result.isTruncated).toBe(true);
      expect(renderToStaticMarkup(result.element)).toBe(
        '<p>Hello <a class="text-blue-500" href="https://app.ens.domains/luc.eth" rel="noopener noreferrer" target="_blank">@luc.eth</a>! Check <a class="underline" href="https://example.com" rel="noopener noreferrer" target="_blank">https://example.com</a>...</p>',
      );
    });

    it("handles truncation with consecutive newlines", () => {
      const result = renderToReact({
        content: "Line 1\n\n\nLine 2\nLine 3",
        references: [],
        maxLines: 2,
      });

      expect(result.isTruncated).toBe(true);
      expect(renderToStaticMarkup(result.element)).toBe(
        "<p>Line 1</p><p>Line 2</p>",
      );
    });

    it("handles truncation with unicode characters", () => {
      const result = renderToReact({
        content: "👀 Hello @luc.eth! 🎉",
        references: [
          {
            type: "ens",
            address: "0x225f137127d9067788314bc7fcc1f36746a3c3B5",
            name: "luc.eth",
            avatarUrl: "https://example.com/avatar.jpg",
            url: "https://app.ens.domains/luc.eth",
            position: {
              start: 9,
              end: 17,
            },
          },
        ],
        maxLength: 16, // "👀 Hello @luc.eth" = 16 characters (counting unicode as one character)
      });

      expect(result.isTruncated).toBe(true);
      expect(renderToStaticMarkup(result.element)).toBe(
        '<p>👀 Hello <a class="text-blue-500" href="https://app.ens.domains/luc.eth" rel="noopener noreferrer" target="_blank">@luc.eth</a>...</p>',
      );
    });
  });
});

describe("renderToMarkdown", () => {
  it("render empty content", () => {
    const result = renderToMarkdown({
      content: "",
      references: [],
    });

    expect(result.mediaReferences).toEqual([]);
    expect(result.result).toBe("");
  });

  it("renders basic text", () => {
    const result = renderToMarkdown({
      content: "Hello, world!",
      references: [],
    });

    expect(result.mediaReferences).toEqual([]);
    expect(result.result).toBe("Hello, world!\n\n");
  });

  it("renders paragraphs", () => {
    const result = renderToMarkdown({
      content: "Par 1\nPar2\n\n\nPar3",
      references: [],
    });

    expect(result.mediaReferences).toEqual([]);
    expect(result.result).toBe("Par 1\n\nPar2\n\nPar3\n\n");
  });

  it("renders references properly", () => {
    const result = renderToMarkdown({
      content:
        "Test 0x225f137127d9067788314bc7fcc1f36746a3c3B5 @0x78397D9D185D3a57D01213CBe3Ec1EbAC3EEc77d $USDC",
      references: [
        {
          type: "ens",
          url: "https://app.ens.domains/0x225f137127d9067788314bc7fcc1f36746a3c3B5",
          avatarUrl:
            "https://ipfs.io/ipfs/bafkreifnrjhkl7ccr2ifwn2n7ap6dh2way25a6w5x2szegvj5pt4b5nvfu",
          name: "luc.eth",
          address: "0x225f137127d9067788314bc7fcc1f36746a3c3B5",
          position: {
            start: 5,
            end: 47,
          },
        },
        {
          type: "farcaster",
          address: "0x78397D9D185D3a57D01213CBe3Ec1EbAC3EEc77d",
          fid: 341794,
          fname: "mskr.fcast.id",
          url: "https://farcaster.xyz/mskr",
          username: "mskr",
          displayName: "mskr",
          pfpUrl: "https://i.imgur.com/DyoLsDd.jpg",
          position: {
            start: 48,
            end: 91,
          },
        },
      ],
    });

    expect(result.mediaReferences).toEqual([]);
    expect(result.result).toBe(
      "Test [@luc.eth](https://app.ens.domains/0x225f137127d9067788314bc7fcc1f36746a3c3B5) [@mskr.fcast.id](https://farcaster.xyz/mskr) $USDC\n\n",
    );
  });

  it("correctly renders unicode characters", () => {
    const result = renderToMarkdown({
      content:
        "👀 what is 🎶 luc.eth this $USDC 💻   @0x78397D9D185D3a57D01213CBe3Ec1EbAC3EEc77d.",
      references: [
        {
          type: "ens",
          address: "0x225f137127d9067788314bc7fcc1f36746a3c3B5",
          name: "luc.eth",
          avatarUrl:
            "https://ipfs.io/ipfs/bafkreifnrjhkl7ccr2ifwn2n7ap6dh2way25a6w5x2szegvj5pt4b5nvfu",
          url: "https://app.ens.domains/luc.eth",
          position: {
            start: 14,
            end: 21,
          },
        },
        {
          type: "erc20",
          address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
          name: "USD Coin",
          symbol: "USDC",
          logoURI:
            "https://tokens.1inch.io/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png",
          decimals: 6,
          chainId: null,
          chains: [
            {
              caip: "eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
              chainId: 1,
            },
          ],
          position: {
            start: 27,
            end: 32,
          },
        },
        {
          type: "farcaster",
          fid: 341794,
          fname: "mskr.fcast.id",
          address: "0x78397D9D185D3a57D01213CBe3Ec1EbAC3EEc77d",
          url: "https://farcaster.xyz/mskr",
          username: "mskr",
          displayName: "mskr",
          pfpUrl: "https://i.imgur.com/DyoLsDd.jpg",
          position: {
            start: 38,
            end: 81,
          },
        },
      ],
    });

    expect(result.mediaReferences).toEqual([]);
    expect(result.result).toBe(
      "👀 what is 🎶 [@luc.eth](https://app.ens.domains/luc.eth) this $USDC 💻   [@mskr.fcast.id](https://farcaster.xyz/mskr).\n\n",
    );
  });

  it("renders urls", () => {
    const result = renderToMarkdown({
      content: "🌎 https://example.com/test 💻 @luc.eth http://localhost:3000",
      references: [
        {
          type: "ens",
          address: "0x225f137127d9067788314bc7fcc1f36746a3c3B5",
          name: "luc.eth",
          avatarUrl:
            "https://ipfs.io/ipfs/bafkreifnrjhkl7ccr2ifwn2n7ap6dh2way25a6w5x2szegvj5pt4b5nvfu",
          url: "https://app.ens.domains/luc.eth",
          position: {
            start: 31,
            end: 39,
          },
        },
      ],
    });

    expect(result.mediaReferences).toEqual([]);
    expect(result.result).toBe(
      "🌎 [https://example.com/test](https://example.com/test) 💻 [@luc.eth](https://app.ens.domains/luc.eth) [http://localhost:3000](http://localhost:3000)\n\n",
    );
  });

  it("sdad", () => {
    const result = renderToMarkdown({
      content:
        "This is local test by @0x78397D9D185D3a57D01213CBe3Ec1EbAC3EEc77d with link https://www.ethcomments.xyz/ and uploaded file\nhttps://amber-electoral-takin-876.mypinata.cloud/ipfs/bafybeihnltvyg5fgrvvqdszx6skfpkmg4hjtumj4gdn7wdwjba2uxnzsgu",
      references: [
        {
          fid: 341794,
          url: "https://farcaster.xyz/mskr",
          type: "farcaster",
          fname: "mskr.fcast.id",
          pfpUrl: "https://i.imgur.com/DyoLsDd.jpg",
          address: "0x78397D9D185D3a57D01213CBe3Ec1EbAC3EEc77d",
          position: { end: 65, start: 22 },
          username: "mskr",
          displayName: "mskr",
        },
        {
          url: "https://www.ethcomments.xyz/",
          type: "webpage",
          title: "ECP",
          favicon: "https://www.ethcomments.xyz/favicon.ico",
          position: { end: 104, start: 76 },
          opengraph: {
            url: "https://ethcomments.xyz",
            image: "https://www.ethcomments.xyz/og-image.png",
            title: "ECP",
            description:
              "A modular protocol for onchain comments that enables apps to add social features without buying into a full-stack social network. Built on Ethereum standards, chain-agnostic, and free to use.",
          },
          description:
            "A modular protocol for onchain comments that enables apps to add social features without buying into a full-stack social network. Built on Ethereum standards, chain-agnostic, and free to use.",
          mediaType: "text/html",
        },
        {
          url: "https://amber-electoral-takin-876.mypinata.cloud/ipfs/bafybeihnltvyg5fgrvvqdszx6skfpkmg4hjtumj4gdn7wdwjba2uxnzsgu",
          type: "image",
          position: { end: 236, start: 123 },
          mediaType: "image/png",
        },
      ],
    });

    expect(result.mediaReferences).toEqual([]);
    expect(result.result).toBe(
      "This is local test by [@mskr.fcast.id](https://farcaster.xyz/mskr) with link [https://www.ethcomments.xyz/](https://www.ethcomments.xyz/) and uploaded file\n\n![Image](https://amber-electoral-takin-876.mypinata.cloud/ipfs/bafybeihnltvyg5fgrvvqdszx6skfpkmg4hjtumj4gdn7wdwjba2uxnzsgu)\n\n",
    );
  });

  it("does not remove last urls that have reference", () => {
    const result = renderToMarkdown({
      content:
        "What is @luc.eth this $USDC @0x78397D9D185D3a57D01213CBe3Ec1EbAC3EEc77d.\nhttp://donthavereference.tld\nhttp://image.tld\nhttp://video.tld",
      references: [
        {
          type: "ens",
          address: "0x225f137127d9067788314bc7fcc1f36746a3c3B5",
          name: "luc.eth",
          avatarUrl:
            "https://ipfs.io/ipfs/bafkreifnrjhkl7ccr2ifwn2n7ap6dh2way25a6w5x2szegvj5pt4b5nvfu",
          url: "https://app.ens.domains/luc.eth",
          position: {
            start: 8,
            end: 16,
          },
        },
        {
          type: "erc20",
          address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
          name: "USD Coin",
          symbol: "USDC",
          logoURI:
            "https://tokens.1inch.io/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png",
          decimals: 6,
          chainId: null,
          chains: [
            {
              caip: "eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
              chainId: 1,
            },
          ],
          position: {
            start: 22,
            end: 27,
          },
        },
        {
          type: "farcaster",
          fid: 341794,
          fname: "mskr.fcast.id",
          address: "0x78397D9D185D3a57D01213CBe3Ec1EbAC3EEc77d",
          url: "https://farcaster.xyz/mskr",
          username: "mskr",
          displayName: "mskr",
          pfpUrl: "https://i.imgur.com/DyoLsDd.jpg",
          position: {
            start: 28,
            end: 71,
          },
        },
        {
          type: "image",
          mediaType: "image/png",
          position: {
            start: 102,
            end: 118,
          },
          url: "http://image.tld",
        },
        {
          type: "video",
          mediaType: "video/mp4",
          position: {
            start: 119,
            end: 135,
          },
          url: "http://video.tld",
        },
      ],
    });

    expect(result.mediaReferences).toEqual([]);

    expect(result.result).toBe(
      "What is [@luc.eth](https://app.ens.domains/luc.eth) this $USDC [@mskr.fcast.id](https://farcaster.xyz/mskr).\n\n[http://donthavereference.tld](http://donthavereference.tld)\n\n![Image](http://image.tld)\n\n![Video](http://video.tld)\n\n",
    );
  });

  it("works correctly just with text and uploaded file", () => {
    const result = renderToMarkdown({
      content:
        "Test\nhttps://amber-electoral-takin-876.mypinata.cloud/ipfs/bafybeihnltvyg5fgrvvqdszx6skfpkmg4hjtumj4gdn7wdwjba2uxnzsgu",
      references: [
        {
          type: "image",
          mediaType: "image/png",
          position: {
            start: 5,
            end: 118,
          },
          url: "https://amber-electoral-takin-876.mypinata.cloud/ipfs/bafybeihnltvyg5fgrvvqdszx6skfpkmg4hjtumj4gdn7wdwjba2uxnzsgu",
        },
      ],
    });

    expect(result.mediaReferences).toEqual([]);
    expect(result.result).toBe(
      "Test\n\n![Image](https://amber-electoral-takin-876.mypinata.cloud/ipfs/bafybeihnltvyg5fgrvvqdszx6skfpkmg4hjtumj4gdn7wdwjba2uxnzsgu)\n\n",
    );
  });

  describe("truncation", () => {
    it("truncates by maxLength considering rendered text", () => {
      const result = renderToMarkdown({
        content: "Hello @luc.eth world!",
        references: [
          {
            type: "ens",
            address: "0x225f137127d9067788314bc7fcc1f36746a3c3B5",
            name: "luc.eth",
            avatarUrl: "https://example.com/avatar.jpg",
            url: "https://app.ens.domains/luc.eth",
            position: {
              start: 6,
              end: 14,
            },
          },
        ],
        maxLength: 15, // "Hello @luc.eth " = 15 characters
      });

      expect(result.isTruncated).toBe(true);
      expect(result.result).toBe(
        "Hello [@luc.eth](https://app.ens.domains/luc.eth)...\n\n",
      );
    });

    it("truncates by maxLength with regular text", () => {
      const result = renderToMarkdown({
        content: "This is a very long text that should be truncated",
        references: [],
        maxLength: 20,
      });

      expect(result.isTruncated).toBe(true);
      expect(result.result).toBe("This is a very long...\n\n");
    });

    it("truncates by maxLength with URLs", () => {
      const result = renderToMarkdown({
        content: "Check this link: https://example.com/very-long-url",
        references: [],
        maxLength: 25, // "Check this link: https://" = 25 characters
      });

      expect(result.isTruncated).toBe(true);
      expect(result.result).toBe("Check this link:...\n\n");
    });

    it("truncates by maxLines", () => {
      const result = renderToMarkdown({
        content: "Line 1\nLine 2\nLine 3\nLine 4",
        references: [],
        maxLines: 2,
      });

      expect(result.isTruncated).toBe(true);
      expect(result.result).toBe("Line 1\n\nLine 2\n\n");
    });

    it("truncates by maxLines with references", () => {
      const result = renderToMarkdown({
        content: "Line 1 with @luc.eth\nLine 2 with $USDC\nLine 3\nLine 4",
        references: [
          {
            type: "ens",
            address: "0x225f137127d9067788314bc7fcc1f36746a3c3B5",
            name: "luc.eth",
            avatarUrl: "https://example.com/avatar.jpg",
            url: "https://app.ens.domains/luc.eth",
            position: {
              start: 12,
              end: 20,
            },
          },
          {
            type: "erc20",
            address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
            name: "USD Coin",
            symbol: "USDC",
            logoURI: "https://example.com/usdc.png",
            decimals: 6,
            chainId: null,
            chains: [
              {
                caip: "eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
                chainId: 1,
              },
            ],
            position: {
              start: 33,
              end: 38,
            },
          },
        ],
        maxLines: 2,
      });

      expect(result.isTruncated).toBe(true);
      expect(result.result).toBe(
        "Line 1 with [@luc.eth](https://app.ens.domains/luc.eth)\n\nLine 2 with $USDC\n\n",
      );
    });

    it("respects both maxLength and maxLines", () => {
      const result = renderToMarkdown({
        content:
          "Very long line that exceeds the length limit\nShort line\nAnother line",
        references: [],
        maxLength: 20,
        maxLines: 2,
      });

      expect(result.isTruncated).toBe(true);
      expect(result.result).toBe("Very long line that...\n\n");
    });

    it("does not truncate when limits are not exceeded", () => {
      const result = renderToMarkdown({
        content: "Short text",
        references: [],
        maxLength: 100,
        maxLines: 10,
      });

      expect(result.isTruncated).toBe(false);
      expect(result.result).toBe("Short text\n\n");
    });

    it("handles truncation with mixed content types", () => {
      const result = renderToMarkdown({
        content: "Hello @luc.eth! Check https://example.com and $USDC",
        references: [
          {
            type: "ens",
            address: "0x225f137127d9067788314bc7fcc1f36746a3c3B5",
            name: "luc.eth",
            avatarUrl: "https://example.com/avatar.jpg",
            url: "https://app.ens.domains/luc.eth",
            position: {
              start: 6,
              end: 14,
            },
          },
          {
            type: "webpage",
            position: {
              start: 22,
              end: 41,
            },
            url: "https://example.com",
            title: "Example",
            description: "Example description",
            favicon: null,
            opengraph: null,
            mediaType: "text/html",
          },
          {
            type: "erc20",
            address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
            name: "USD Coin",
            symbol: "USDC",
            logoURI: "https://example.com/usdc.png",
            decimals: 6,
            chainId: null,
            chains: [
              {
                caip: "eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
                chainId: 1,
              },
            ],
            position: {
              start: 46,
              end: 51,
            },
          },
        ],
        maxLength: 42, // "Hello @luc.eth! Check https://example.com " = 42 characters
      });

      expect(result.isTruncated).toBe(true);
      expect(result.result).toBe(
        "Hello [@luc.eth](https://app.ens.domains/luc.eth)! Check [https://example.com](https://example.com)...\n\n",
      );
    });

    it("handles truncation with consecutive newlines", () => {
      const result = renderToMarkdown({
        content: "Line 1\n\n\nLine 2\nLine 3",
        references: [],
        maxLines: 2,
      });

      expect(result.isTruncated).toBe(true);
      expect(result.result).toBe("Line 1\n\nLine 2\n\n");
    });

    it("handles truncation with unicode characters", () => {
      const result = renderToMarkdown({
        content: "👀 Hello @luc.eth! 🎉",
        references: [
          {
            type: "ens",
            address: "0x225f137127d9067788314bc7fcc1f36746a3c3B5",
            name: "luc.eth",
            avatarUrl: "https://example.com/avatar.jpg",
            url: "https://app.ens.domains/luc.eth",
            position: {
              start: 9,
              end: 17,
            },
          },
        ],
        maxLength: 16, // "👀 Hello @luc.eth" = 16 characters (counting unicode as one character)
      });

      expect(result.isTruncated).toBe(true);
      expect(result.result).toBe(
        "👀 Hello [@luc.eth](https://app.ens.domains/luc.eth)...\n\n",
      );
    });

    it("renders image references", () => {
      const result = renderToMarkdown({
        content: "https://example.com/image.png",
        references: [
          {
            type: "image",
            mediaType: "image/png",
            position: { start: 0, end: 29 },
            url: "https://example.com/image.png",
          },
        ],
      });

      expect(result.result).toBe("![Image](https://example.com/image.png)\n\n");
    });

    it("renders video references", () => {
      const result = renderToMarkdown({
        content: "https://example.com/video.mp4",
        references: [
          {
            type: "video",
            mediaType: "video/mp4",
            position: { start: 0, end: 29 },
            url: "https://example.com/video.mp4",
          },
        ],
      });

      expect(result.result).toBe("![Video](https://example.com/video.mp4)\n\n");
    });

    it("renders file references", () => {
      const result = renderToMarkdown({
        content: "https://example.com/file.pdf",
        references: [
          {
            type: "file",
            mediaType: "application/pdf",
            position: { start: 0, end: 28 },
            url: "https://example.com/file.pdf",
          },
        ],
      });

      expect(result.result).toBe(
        "[https://example.com/file.pdf](https://example.com/file.pdf)\n\n",
      );
    });

    it("renders webpage references", () => {
      const result = renderToMarkdown({
        content: "https://example.com",
        references: [
          {
            type: "webpage",
            position: { start: 0, end: 19 },
            url: "https://example.com",
            description: null,
            title: "",
            favicon: null,
            opengraph: null,
            mediaType: "text/html",
          },
        ],
      });

      expect(result.result).toBe(
        "[https://example.com](https://example.com)\n\n",
      );
    });

    it("allows to pass custom element renderers", () => {
      const elementRenderers = {
        text: (text: string) => `**${text}**`,
      };

      const result = renderToMarkdown({
        content: "Hello, world!",
        references: [],
        elementRenderers,
      });

      expect(result.result).toBe("**Hello, world!**\n\n");
    });
  });
});
