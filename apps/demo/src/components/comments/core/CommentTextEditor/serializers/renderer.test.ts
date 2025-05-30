import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { customMarkdownParser } from "./markdown.js";
import { renderModel } from "./renderer.js";

describe("renderModel", () => {
  it("render empty markdown", () => {
    const model = customMarkdownParser.parse("");

    const result = renderModel(model);

    expect(renderToStaticMarkup(result)).toBe("<p></p>");
  });

  it("renders basic text", () => {
    const model = customMarkdownParser.parse("Hello, world!");

    const result = renderModel(model);

    expect(renderToStaticMarkup(result)).toBe("<p>Hello, world!</p>");
  });

  it("renders bold text", () => {
    const model = customMarkdownParser.parse("**bold**");

    const result = renderModel(model);

    expect(renderToStaticMarkup(result)).toBe("<p><strong>bold</strong></p>");
  });

  it("renders italic text", () => {
    const model = customMarkdownParser.parse("_italic_");

    const result = renderModel(model);

    expect(renderToStaticMarkup(result)).toBe("<p><em>italic</em></p>");
  });

  it("renders link text", () => {
    const model = customMarkdownParser.parse("[link](https://example.com)");

    const result = renderModel(model);

    expect(renderToStaticMarkup(result)).toBe(
      '<p><a href="https://example.com">link</a></p>',
    );
  });

  it("renders multiple marks", () => {
    const model = customMarkdownParser.parse(
      "**bold** _italic_ [link](https://example.com)",
    );

    const result = renderModel(model);

    expect(renderToStaticMarkup(result)).toBe(
      '<p><strong>bold</strong> <em>italic</em> <a href="https://example.com">link</a></p>',
    );
  });

  it("renders text wrapped in multiple marks", () => {
    const model = customMarkdownParser.parse(
      "[**_bold_italic_**](https://example.com)",
    );

    const result = renderModel(model);

    expect(renderToStaticMarkup(result)).toBe(
      '<p><a href="https://example.com"><em><strong>bold_italic</strong></em></a></p>',
    );
  });

  describe("address mention", () => {
    it("renders address mention that doesn't have ens name", () => {
      const address = Buffer.from("1".repeat(20)).toString("hex");

      const model = customMarkdownParser.parse(`[@0x${address}](0x${address})`);

      const result = renderModel(model);

      expect(renderToStaticMarkup(result)).toBe(`<p>@0x${address}</p>`);
    });

    it("renders address mention with resolved ens name", () => {
      const address = Buffer.from("1".repeat(20)).toString("hex");
      const ens = "test.eth";

      const model = customMarkdownParser.parse(`[@${ens}](0x${address})`);

      const result = renderModel(model);

      expect(renderToStaticMarkup(result)).toBe(`<p>@${ens}</p>`);
    });
  });

  describe("token mention", () => {
    it("renders token mention that doesn't have symbol", () => {
      const caip19 =
        "eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";
      // this one is for example if we couldn't resolve the symbol data, then we will just as is
      const md = `[$${caip19}](${caip19})`;

      const model = customMarkdownParser.parse(md);

      const result = renderModel(model);

      expect(renderToStaticMarkup(result)).toBe(`<p>$${caip19}</p>`);
    });

    it("renders token mention that has symbol", () => {
      const caip19 =
        "eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";
      const md = `[$USDC](${caip19})`;

      const model = customMarkdownParser.parse(md);

      const result = renderModel(model);

      expect(renderToStaticMarkup(result)).toBe(`<p>$USDC</p>`);
    });

    it("renders unresolved symbol", () => {
      const symbol = "USDC";
      const md = `$${symbol}`;

      const model = customMarkdownParser.parse(md);

      const result = renderModel(model);

      expect(renderToStaticMarkup(result)).toBe(`<p>$USDC</p>`);
    });
  });

  it("renders correctly", () => {
    const content =
      "[$USDC](eip155:8453/erc20:0x833589fcd6edb6e08f4c7c32d4f71b54bda02913) adsadasd [@0x78397D9D185D3a57D01213CBe3Ec1EbAC3EEc77d](0x78397D9D185D3a57D01213CBe3Ec1EbAC3EEc77d)";

    const model = customMarkdownParser.parse(content);

    const result = renderModel(model);

    expect(renderToStaticMarkup(result)).toBe(
      "<p>$USDC adsadasd @0x78397D9D185D3a57D01213CBe3Ec1EbAC3EEc77d</p>",
    );
  });
});
