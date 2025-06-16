import { describe, it, expect } from "vitest";
import { parse } from "./parser";

describe("content parser", () => {
  it("returns doc with empty paragraph if no content is provided", () => {
    const content = parse("", []);

    expect(content).toEqual({
      type: "doc",
      content: [{ type: "paragraph", content: [] }],
    });
  });

  it("properly maps new links to hard breaks", () => {
    const content = parse("Hello\nWorld\n\n\n\r\n\rTest", []);

    expect(content).toEqual({
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Hello" }] },
        { type: "paragraph" },
        { type: "paragraph", content: [{ type: "text", text: "World" }] },
        { type: "paragraph" },
        { type: "paragraph" },
        { type: "paragraph" },
        { type: "paragraph" },
        { type: "paragraph" },
        { type: "paragraph", content: [{ type: "text", text: "Test" }] },
      ],
    });
  });

  it("returns doc with text pargraph if only text is provided", () => {
    const content = parse("Hello 🌎", []);

    expect(content).toEqual({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Hello 🌎" }],
        },
      ],
    });
  });

  it("maps ens references to mentions", () => {
    const content = parse("Hello @0x1234567890123456789012345678901234567890", [
      {
        type: "ens",
        address: "0x1234567890123456789012345678901234567890",
        name: "John Doe",
        avatarUrl: null,
        url: "",
        position: {
          start: 6,
          end: 49,
        },
      },
    ]);

    expect(content).toEqual({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Hello " },
            {
              type: "mention",
              attrs: {
                type: "ens",
                address: "0x1234567890123456789012345678901234567890",
                name: "John Doe",
                url: "",
              },
            },
          ],
        },
      ],
    });
  });

  it("maps farcaster references to mentions", () => {
    const content = parse("Hello @0x1234567890123456789012345678901234567890", [
      {
        type: "farcaster",
        address: "0x1234567890123456789012345678901234567890",
        fid: 1234567890,
        pfpUrl: null,
        displayName: null,
        url: "",
        username: "username",
        fname: "username.fcast.id",
        position: {
          start: 6,
          end: 49,
        },
      },
    ]);

    expect(content).toEqual({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Hello " },
            {
              type: "mention",
              attrs: {
                type: "farcaster",
                address: "0x1234567890123456789012345678901234567890",
                fid: 1234567890,
                fname: "username.fcast.id",
                displayName: null,
                username: "username",
                pfpUrl: null,
                url: "",
              },
            },
          ],
        },
      ],
    });
  });

  it("maps erc20 references to mentions", () => {
    const content = parse("Hello $0x1234567890123456789012345678901234567890", [
      {
        type: "erc20",
        address: "0x1234567890123456789012345678901234567890",
        name: "John Doe",
        symbol: "JDOE",
        chainId: 1,
        position: {
          start: 6,
          end: 49,
        },
        logoURI: null,
        decimals: 18,
        chains: [
          {
            chainId: 1,
            caip: "eip155:1/erc20:0x1234567890123456789012345678901234567890",
          },
        ],
      },
    ]);

    expect(content).toEqual({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Hello " },
            {
              type: "mention",
              attrs: {
                type: "erc20",
                address: "0x1234567890123456789012345678901234567890",
                name: "John Doe",
                symbol: "JDOE",
                chainId: 1,
                caip19:
                  "eip155:1/erc20:0x1234567890123456789012345678901234567890",
                decimals: 18,
                logoURI: null,
              },
            },
          ],
        },
      ],
    });
  });

  it("maps urls to links", () => {
    const content = parse(
      "🌎 https://example.com/test 💻 nehehe http://localhost:3000",
      [],
    );

    expect(content).toEqual({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "🌎 " },
            {
              type: "text",
              marks: [
                {
                  type: "link",
                  attrs: {
                    href: "https://example.com/test",
                    class: "underline cursor-pointer",
                    rel: "noopener noreferrer",
                    target: "_blank",
                  },
                },
              ],
              text: "https://example.com/test",
            },
            { type: "text", text: " 💻 nehehe " },
            {
              type: "text",
              marks: [
                {
                  type: "link",
                  attrs: {
                    href: "http://localhost:3000",
                    class: "underline cursor-pointer",
                    rel: "noopener noreferrer",
                    target: "_blank",
                  },
                },
              ],
              text: "http://localhost:3000",
            },
          ],
        },
      ],
    });
  });

  it("parses unicode characters", () => {
    const content = parse(
      "👀 what is 🎶 luc.eth this $USDC 💻   @0x78397D9D185D3a57D01213CBe3Ec1EbAC3EEc77d.",
      [
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
          decimals: 18,
          chainId: 1,
          chains: [
            {
              chainId: 1,
              caip: "eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
            },
          ],
          position: {
            start: 27,
            end: 32,
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
            start: 38,
            end: 81,
          },
        },
      ],
    );

    expect(content).toEqual({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "👀 what is 🎶 " },
            {
              type: "mention",
              attrs: {
                type: "ens",
                address: "0x225f137127d9067788314bc7fcc1f36746a3c3B5",
                name: "luc.eth",
                url: "https://app.ens.domains/luc.eth",
              },
            },
            { type: "text", text: " this " },
            {
              type: "mention",
              attrs: {
                type: "erc20",
                address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
                name: "USD Coin",
                symbol: "USDC",
                chainId: 1,
                decimals: 18,
                logoURI:
                  "https://tokens.1inch.io/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png",
                caip19:
                  "eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
              },
            },
            { type: "text", text: " 💻   " },
            {
              type: "mention",
              attrs: {
                type: "farcaster",
                address: "0x78397D9D185D3a57D01213CBe3Ec1EbAC3EEc77d",
                fid: 341794,
                fname: "mskr.fcast.id",
                displayName: "mskr",
                username: "mskr",
                pfpUrl: "https://i.imgur.com/DyoLsDd.jpg",
                url: "https://farcaster.xyz/mskr",
              },
            },
            { type: "text", text: "." },
          ],
        },
      ],
    });
  });

  it("correctly parses complex text with unicode characters", () => {
    const content = parse(
      "Hello 🌎 @0x1234567890123456789012345678901234567890 💻\n\nhttps://example.com\n❤️ @0x78397D9D185D3a57D01213CBe3Ec1EbAC3EEc77d",
      [
        {
          type: "ens",
          address: "0x1234567890123456789012345678901234567890",
          name: "John Doe",
          avatarUrl: null,
          url: "",
          position: {
            start: 9,
            end: 52,
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
            start: 80,
            end: 123,
          },
        },
      ],
    );

    expect(content).toEqual({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Hello 🌎 " },
            {
              type: "mention",
              attrs: {
                type: "ens",
                address: "0x1234567890123456789012345678901234567890",
                name: "John Doe",
                url: "",
              },
            },
            { type: "text", text: " 💻" },
          ],
        },
        { type: "paragraph" },
        { type: "paragraph" },
        {
          type: "paragraph",
          content: [
            {
              marks: [
                {
                  type: "link",
                  attrs: {
                    href: "https://example.com",
                    class: "underline cursor-pointer",
                    rel: "noopener noreferrer",
                    target: "_blank",
                  },
                },
              ],
              type: "text",
              text: "https://example.com",
            },
          ],
        },
        { type: "paragraph" },
        {
          type: "paragraph",
          content: [
            { type: "text", text: "❤️ " },
            {
              type: "mention",
              attrs: {
                type: "farcaster",
                address: "0x78397D9D185D3a57D01213CBe3Ec1EbAC3EEc77d",
                fid: 341794,
                fname: "mskr.fcast.id",
                displayName: "mskr",
                username: "mskr",
                pfpUrl: "https://i.imgur.com/DyoLsDd.jpg",
                url: "https://farcaster.xyz/mskr",
              },
            },
          ],
        },
      ],
    });
  });
});
