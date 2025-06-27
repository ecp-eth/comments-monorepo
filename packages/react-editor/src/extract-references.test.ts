import { describe, it, expect } from "vitest";
import { extractReferences } from "./extract-references";
import { renderToReact } from "@ecp.eth/shared/renderer";
import { renderToStaticMarkup } from "react-dom/server";

describe("extractReferences", () => {
  it("should extract references from content", () => {
    const content = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Test 💻 🌎 ",
            },
            {
              type: "mention",
              attrs: {
                address: "0x78397D9D185D3a57D01213CBe3Ec1EbAC3EEc77d",
                fid: 341794,
                fname: "mskr.fcast.id",
                username: "mskr",
                displayName: "mskr",
                pfpUrl: "https://i.imgur.com/DyoLsDd.jpg",
                url: "https://farcaster.xyz/mskr",
                type: "farcaster",
              },
            },
            {
              type: "text",
              text: " ",
            },
            {
              type: "mention",
              attrs: {
                address: "0xb8c2C29ee19D8307cb7255e1Cd9CbDE883A267d5",
                name: "nick.eth",
                url: "https://app.ens.domains/0xb8c2C29ee19D8307cb7255e1Cd9CbDE883A267d5",
                type: "ens",
              },
            },
            {
              type: "text",
              text: " ",
            },
          ],
        },
        {
          type: "paragraph",
        },
        {
          type: "paragraph",
          content: [
            {
              type: "mention",
              attrs: {
                address: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
                caip19:
                  "eip155:8453/erc20:0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
                chainId: 8453,
                name: "USD Coin",
                symbol: "USDC",
                type: "erc20",
                decimals: 6,
                logoURI: null,
              },
            },
            {
              type: "text",
              text: " ",
            },
            {
              type: "text",
              marks: [
                {
                  type: "link",
                  attrs: {
                    href: "http://localhost:3000/",
                    target: "_blank",
                    rel: "noopener noreferrer nofollow",
                    class: "underline cursor-pointer",
                  },
                },
              ],
              text: "http://localhost:3000/",
            },
            {
              type: "text",
              text: " ",
            },
          ],
        },
        {
          type: "paragraph",
        },
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "new paragraph",
            },
          ],
        },
        {
          type: "uploadTracker",
          attrs: {
            uploads: [
              {
                id: "9d360211-2d32-4017-b74f-d7bda3e2b615",
                name: "ChatGPT Image Jun 13, 2025 at 06_49_31 AM.png",
                url: "https://amber-electoral-takin-876.mypinata.cloud/ipfs/bafybeihnltvyg5fgrvvqdszx6skfpkmg4hjtumj4gdn7wdwjba2uxnzsgu",
                mimeType: "image/png",
              },
              {
                id: "05156077-8d2f-4c63-a121-5ee43cd55b5c",
                name: "ChatGPT Image Jun 13, 2025 at 06_55_01 AM.png",
                url: "https://amber-electoral-takin-876.mypinata.cloud/ipfs/bafybeid4frcnmrdawjzhsvizeph6h3qpbmbjs2g4233lysl7jg3xd7owii",
                mimeType: "image/png",
              },
            ],
          },
        },
      ],
    };

    const references = extractReferences(content);

    expect(references).toStrictEqual([
      {
        type: "farcaster",
        displayName: "mskr",
        username: "mskr",
        address: "0x78397D9D185D3a57D01213CBe3Ec1EbAC3EEc77d",
        fid: 341794,
        fname: "mskr.fcast.id",
        pfpUrl: "https://i.imgur.com/DyoLsDd.jpg",
        url: "https://farcaster.xyz/mskr",
        position: {
          start: 11,
          end: 54,
        },
      },
      {
        type: "ens",
        address: "0xb8c2C29ee19D8307cb7255e1Cd9CbDE883A267d5",
        avatarUrl: null,
        name: "nick.eth",
        position: {
          start: 55,
          end: 98,
        },
        url: "https://app.ens.domains/0xb8c2C29ee19D8307cb7255e1Cd9CbDE883A267d5",
      },
      {
        type: "erc20",
        address: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
        chainId: 8453,
        chains: [
          {
            caip: "eip155:8453/erc20:0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
            chainId: 8453,
          },
        ],
        decimals: 6,
        logoURI: null,
        name: "USD Coin",
        symbol: "USDC",
        position: {
          start: 101,
          end: 161,
        },
      },
      {
        type: "image",
        position: {
          start: 201,
          end: 314,
        },
        url: "https://amber-electoral-takin-876.mypinata.cloud/ipfs/bafybeihnltvyg5fgrvvqdszx6skfpkmg4hjtumj4gdn7wdwjba2uxnzsgu",
        mediaType: "image/png",
      },
      {
        type: "image",
        position: {
          start: 315,
          end: 428,
        },
        url: "https://amber-electoral-takin-876.mypinata.cloud/ipfs/bafybeid4frcnmrdawjzhsvizeph6h3qpbmbjs2g4233lysl7jg3xd7owii",
        mediaType: "image/png",
      },
    ]);

    const result = renderToReact({
      content:
        "Test 💻 🌎 @0x78397D9D185D3a57D01213CBe3Ec1EbAC3EEc77d @0xb8c2C29ee19D8307cb7255e1Cd9CbDE883A267d5 \n\neip155:8453/erc20:0x833589fcd6edb6e08f4c7c32d4f71b54bda02913 http://localhost:3000/\n\n\nnew paragraph\nhttps://amber-electoral-takin-876.mypinata.cloud/ipfs/bafybeihnltvyg5fgrvvqdszx6skfpkmg4hjtumj4gdn7wdwjba2uxnzsgu\nhttps://amber-electoral-takin-876.mypinata.cloud/ipfs/bafybeid4frcnmrdawjzhsvizeph6h3qpbmbjs2g4233lysl7jg3xd7owii",
      references,
    });

    expect(renderToStaticMarkup(result.element)).toEqual(
      '<p>Test 💻 🌎 <a class="text-blue-500" href="https://farcaster.xyz/mskr" rel="noopener noreferrer" target="_blank">@mskr.fcast.id</a> <a class="text-blue-500" href="https://app.ens.domains/0xb8c2C29ee19D8307cb7255e1Cd9CbDE883A267d5" rel="noopener noreferrer" target="_blank">@nick.eth</a> </p><p><span class="text-blue-500" title="USD Coin">$USDC</span> <a class="underline" href="http://localhost:3000/" rel="noopener noreferrer" target="_blank">http://localhost:3000/</a></p><p>new paragraph</p>',
    );
  });

  it("should extract references from content with new lines", () => {
    const references = extractReferences({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "test",
            },
          ],
        },
        {
          type: "paragraph",
        },
        {
          type: "paragraph",
          content: [
            {
              type: "mention",
              attrs: {
                address: "0x78397D9D185D3a57D01213CBe3Ec1EbAC3EEc77d",
                fid: 341794,
                fname: "mskr.fcast.id",
                username: "mskr",
                displayName: "mskr",
                pfpUrl: "https://i.imgur.com/DyoLsDd.jpg",
                url: "https://farcaster.xyz/mskr",
                type: "farcaster",
              },
            },
          ],
        },
        {
          type: "paragraph",
        },
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "this shit ",
            },
          ],
        },
        {
          type: "paragraph",
        },
        {
          type: "paragraph",
          content: [
            {
              type: "mention",
              attrs: {
                address: "0x78397D9D185D3a57D01213CBe3Ec1EbAC3EEc77d",
                fid: 341794,
                fname: "mskr.fcast.id",
                username: "mskr",
                displayName: "mskr",
                pfpUrl: "https://i.imgur.com/DyoLsDd.jpg",
                url: "https://farcaster.xyz/mskr",
                type: "farcaster",
              },
            },
            {
              type: "text",
              text: " ",
            },
            {
              type: "mention",
              attrs: {
                address: "0x78397D9D185D3a57D01213CBe3Ec1EbAC3EEc77d",
                fid: 341794,
                fname: "mskr.fcast.id",
                username: "mskr",
                displayName: "mskr",
                pfpUrl: "https://i.imgur.com/DyoLsDd.jpg",
                url: "https://farcaster.xyz/mskr",
                type: "farcaster",
              },
            },
            {
              type: "text",
              text: " ",
            },
          ],
        },
        {
          type: "uploadTracker",
          attrs: {
            uploads: [
              {
                id: "d302e113-4ea3-44e6-b81c-163528d03457",
                name: "ChatGPT Image Jun 13, 2025 at 06_49_31 AM.png",
                url: "https://amber-electoral-takin-876.mypinata.cloud/ipfs/bafybeihnltvyg5fgrvvqdszx6skfpkmg4hjtumj4gdn7wdwjba2uxnzsgu",
                mimeType: "image/png",
              },
              {
                id: "219ed94a-4aa1-43af-b3aa-44826161cccd",
                name: "ChatGPT Image Jun 13, 2025 at 06_55_01 AM.png",
                url: "https://amber-electoral-takin-876.mypinata.cloud/ipfs/bafybeid4frcnmrdawjzhsvizeph6h3qpbmbjs2g4233lysl7jg3xd7owii",
                mimeType: "image/png",
              },
            ],
          },
        },
      ],
    });

    const rendered = renderToReact({
      content:
        "test\n\n@0x78397D9D185D3a57D01213CBe3Ec1EbAC3EEc77d\n\nthis shit \n\n@0x78397D9D185D3a57D01213CBe3Ec1EbAC3EEc77d @0x78397D9D185D3a57D01213CBe3Ec1EbAC3EEc77d \nhttps://amber-electoral-takin-876.mypinata.cloud/ipfs/bafybeihnltvyg5fgrvvqdszx6skfpkmg4hjtumj4gdn7wdwjba2uxnzsgu\nhttps://amber-electoral-takin-876.mypinata.cloud/ipfs/bafybeid4frcnmrdawjzhsvizeph6h3qpbmbjs2g4233lysl7jg3xd7owii",
      references,
    });

    expect(references).toStrictEqual([
      {
        type: "farcaster",
        address: "0x78397D9D185D3a57D01213CBe3Ec1EbAC3EEc77d",
        fid: 341794,
        fname: "mskr.fcast.id",
        username: "mskr",
        displayName: "mskr",
        pfpUrl: "https://i.imgur.com/DyoLsDd.jpg",
        url: "https://farcaster.xyz/mskr",
        position: {
          start: 6,
          end: 49,
        },
      },
      {
        type: "farcaster",
        address: "0x78397D9D185D3a57D01213CBe3Ec1EbAC3EEc77d",
        fid: 341794,
        fname: "mskr.fcast.id",
        username: "mskr",
        displayName: "mskr",
        pfpUrl: "https://i.imgur.com/DyoLsDd.jpg",
        url: "https://farcaster.xyz/mskr",
        position: {
          start: 63,
          end: 106,
        },
      },
      {
        type: "farcaster",
        address: "0x78397D9D185D3a57D01213CBe3Ec1EbAC3EEc77d",
        fid: 341794,
        fname: "mskr.fcast.id",
        username: "mskr",
        displayName: "mskr",
        pfpUrl: "https://i.imgur.com/DyoLsDd.jpg",
        url: "https://farcaster.xyz/mskr",
        position: {
          start: 107,
          end: 150,
        },
      },
      {
        type: "image",
        position: {
          start: 152,
          end: 265,
        },
        url: "https://amber-electoral-takin-876.mypinata.cloud/ipfs/bafybeihnltvyg5fgrvvqdszx6skfpkmg4hjtumj4gdn7wdwjba2uxnzsgu",
        mediaType: "image/png",
      },
      {
        type: "image",
        position: {
          start: 266,
          end: 379,
        },
        url: "https://amber-electoral-takin-876.mypinata.cloud/ipfs/bafybeid4frcnmrdawjzhsvizeph6h3qpbmbjs2g4233lysl7jg3xd7owii",
        mediaType: "image/png",
      },
    ]);

    expect(renderToStaticMarkup(rendered.element)).toEqual(
      '<p>test</p><p><a class="text-blue-500" href="https://farcaster.xyz/mskr" rel="noopener noreferrer" target="_blank">@mskr.fcast.id</a></p><p>this shit </p><p><a class="text-blue-500" href="https://farcaster.xyz/mskr" rel="noopener noreferrer" target="_blank">@mskr.fcast.id</a> <a class="text-blue-500" href="https://farcaster.xyz/mskr" rel="noopener noreferrer" target="_blank">@mskr.fcast.id</a></p>',
    );
  });

  it("extracts references from short content", () => {
    const references = extractReferences({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "test",
            },
          ],
        },
        {
          type: "uploadTracker",
          attrs: {
            uploads: [
              {
                id: "d302e113-4ea3-44e6-b81c-163528d03457",
                name: "ChatGPT Image Jun 13, 2025 at 06_49_31 AM.png",
                url: "https://amber-electoral-takin-876.mypinata.cloud/ipfs/bafybeihnltvyg5fgrvvqdszx6skfpkmg4hjtumj4gdn7wdwjba2uxnzsgu",
                mimeType: "image/png",
              },
            ],
          },
        },
      ],
    });

    const rendered = renderToReact({
      content:
        "test\nhttps://amber-electoral-takin-876.mypinata.cloud/ipfs/bafybeihnltvyg5fgrvvqdszx6skfpkmg4hjtumj4gdn7wdwjba2uxnzsgu",
      references,
    });

    expect(references).toStrictEqual([
      {
        type: "image",
        url: "https://amber-electoral-takin-876.mypinata.cloud/ipfs/bafybeihnltvyg5fgrvvqdszx6skfpkmg4hjtumj4gdn7wdwjba2uxnzsgu",
        mediaType: "image/png",
        position: { start: 5, end: 118 },
      },
    ]);
    expect(renderToStaticMarkup(rendered.element)).toEqual("<p>test</p>");
  });
});
