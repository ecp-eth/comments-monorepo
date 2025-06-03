import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { renderToReact } from "./renderer.js";

describe("renderToReact", () => {
  it("render empty content", () => {
    const result = renderToReact({
      content: "",
      references: [],
    });

    expect(renderToStaticMarkup(result)).toBe("");
  });

  it("renders basic text", () => {
    const result = renderToReact({
      content: "Hello, world!",
      references: [],
    });

    expect(renderToStaticMarkup(result)).toBe("<p>Hello, world!</p>");
  });

  it("renders paragraphs", () => {
    const result = renderToReact({
      content: "Par 1\nPar2\n\n\nPar3",
      references: [],
    });

    expect(renderToStaticMarkup(result)).toBe(
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

    expect(renderToStaticMarkup(result)).toBe(
      '<p>Test <a href="https://app.ens.domains/0x225f137127d9067788314bc7fcc1f36746a3c3B5" rel="noopener noreferrer" target="_blank">luc.eth</a> <a href="https://farcaster.xyz/mskr" rel="noopener noreferrer" target="_blank">mskr</a> $USDC</p>',
    );
  });
});
