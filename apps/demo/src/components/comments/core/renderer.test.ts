import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { renderToReact } from "./renderer.js";

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
      '<p>Test <a class="font-medium underline" href="https://app.ens.domains/0x225f137127d9067788314bc7fcc1f36746a3c3B5" rel="noopener noreferrer" target="_blank">luc.eth</a> <a class="font-medium underline" href="https://farcaster.xyz/mskr" rel="noopener noreferrer" target="_blank">mskr</a> $USDC</p>',
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
          caip19: "eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
          url: "https://etherscan.io/token/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
          position: {
            start: 27,
            end: 32,
          },
        },
        {
          type: "farcaster",
          fid: 341794,
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
      '<p>👀 what is 🎶 <a class="font-medium underline" href="https://app.ens.domains/luc.eth" rel="noopener noreferrer" target="_blank">luc.eth</a> this <a class="font-medium underline" href="https://etherscan.io/token/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48" rel="noopener noreferrer" target="_blank" title="USD Coin">$USDC</a> 💻   <a class="font-medium underline" href="https://farcaster.xyz/mskr" rel="noopener noreferrer" target="_blank">mskr</a>.</p>',
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
      '<p>🌎 <a class="font-medium underline" href="https://example.com/test" rel="noopener noreferrer" target="_blank">https://example.com/test</a> 💻 <a class="font-medium underline" href="https://app.ens.domains/luc.eth" rel="noopener noreferrer" target="_blank">luc.eth</a> <a class="font-medium underline" href="http://localhost:3000" rel="noopener noreferrer" target="_blank">http://localhost:3000</a></p>',
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
          caip19: "eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
          url: "https://etherscan.io/token/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
          position: {
            start: 27,
            end: 32,
          },
        },
        {
          type: "farcaster",
          fid: 341794,
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
      '<p>👀 what is 🎶 <a class="font-medium underline" href="https://app.ens.domains/luc.eth" rel="noopener noreferrer" target="_blank">luc.eth</a> this <a class="font-medium underline" href="https://etherscan.io/token/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48" rel="noopener noreferrer" target="_blank" title="USD Coin">$USDC</a> 💻   <a class="font-medium underline" href="https://farcaster.xyz/mskr" rel="noopener noreferrer" target="_blank">mskr</a>.</p><p><a class="font-medium underline" href="http://donthavereference.tld" rel="noopener noreferrer" target="_blank">http://donthavereference.tld</a></p>',
    );
  });
});
