import { MarkdownParser, MarkdownSerializer } from "prosemirror-markdown";
import { Schema } from "prosemirror-model";
import MarkdownIt from "markdown-it";
import { TokenItem } from "../extensions/TokenMention";
import { AddressItem } from "../extensions/AddressMention";

const md = new MarkdownIt();

const ADDRESS_MENTION_REGEX = /^@(0x[a-fA-F0-9]{40}|[a-z0-9-]+\.eth)\s?/;

md.inline.ruler.push("addressMention", (state, silent) => {
  const match = ADDRESS_MENTION_REGEX.exec(state.src.slice(state.pos));

  if (!match) {
    return false;
  }

  if (!silent) {
    const token = state.push("addressMention", "", 0);
    token.content = match[0];
  }

  state.pos += match[0].length;

  return true;
});

const TOKEN_MENTION_REGEX =
  /^\$(eip155:\d+\/erc20:0x[a-fA-F0-9]{40}|[A-Z]+)\s?/;

md.inline.ruler.push("tokenMention", (state, silent) => {
  const match = TOKEN_MENTION_REGEX.exec(state.src.slice(state.pos));

  if (!match) {
    return false;
  }

  if (!silent) {
    const token = state.push("tokenMention", "", 0);
    token.content = match[0];
  }

  state.pos += match[0].length;

  return true;
});

// Create a schema for our document
const schema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: {
      content: "inline*",
      group: "block",
      parseDOM: [{ tag: "p" }],
      toDOM() {
        return ["p", 0];
      },
    },
    text: { group: "inline" },
    addressMention: {
      group: "inline",
      inline: true,
      attrs: {
        id: { default: null },
        label: { default: null },
        resolved: { default: false },
      },
      parseDOM: [
        {
          tag: "span[data-mention]",
          getAttrs: (dom) => ({
            id: dom.getAttribute("data-id"),
            label: dom.getAttribute("data-label"),
            resolved: dom.getAttribute("data-resolved") === "true",
          }),
        },
      ],
    },
    tokenMention: {
      group: "inline",
      inline: true,
      attrs: {
        type: { default: null },
        id: { default: null },
        label: { default: null },
        symbol: { default: null },
        caip19: { default: null },
      },
      parseDOM: [
        {
          tag: "span[data-token-mention]",
          getAttrs: (dom) => ({
            type: dom.getAttribute("data-type"),
            id: dom.getAttribute("data-id"),
            label: dom.getAttribute("data-label"),
            symbol: dom.getAttribute("data-symbol"),
            caip19: dom.getAttribute("data-caip19"),
          }),
        },
      ],
    },
  },
  marks: {
    bold: {
      parseDOM: [{ tag: "strong" }, { tag: "b", getAttrs: () => null }],
      toDOM() {
        return ["strong", 0];
      },
    },
    italic: {
      parseDOM: [{ tag: "i" }, { tag: "em", getAttrs: () => null }],
      toDOM() {
        return ["em", 0];
      },
    },
    link: {
      attrs: { href: {}, title: { default: null } },
      inclusive: false,
      parseDOM: [
        {
          tag: "a[href]",
          getAttrs(dom) {
            return {
              href: dom.getAttribute("href"),
              title: dom.getAttribute("title"),
            };
          },
        },
      ],
      toDOM(node) {
        return ["a", node.attrs, 0];
      },
    },
  },
});

// Create the markdown parser with our schema and token handlers
export const customMarkdownParser = new MarkdownParser(schema, md, {
  paragraph: { block: "paragraph" },
  text: { node: "text" },
  addressMention: {
    node: "addressMention",
    getAttrs: (tok) => ({ id: tok.content.slice(1) }),
  },
  tokenMention: {
    node: "tokenMention",
    getAttrs: (tok) => ({ caip19: tok.content.slice(1) }),
  },
  strong: { mark: "bold" },
  em: { mark: "italic" },
  link: {
    mark: "link",
    getAttrs: (tok) => ({
      href: tok.attrGet("href"),
      title: tok.attrGet("title"),
    }),
  },
});

export const customMarkdownSerializer = new MarkdownSerializer(
  {
    paragraph(state, node) {
      state.renderInline(node);
      state.closeBlock(node);
    },
    text(state, node) {
      state.text(node.text ?? "");
    },
    addressMention(state, node) {
      const attrs = node.attrs as AddressItem;

      state.write(`@${attrs.id}`);
    },
    tokenMention(state, node) {
      const attrs = node.attrs as TokenItem;

      if (attrs.type === "resolved") {
        return state.write(`$${attrs.id}`);
      } else if (attrs.type === "unresolved-symbol") {
        return state.write(`$${attrs.symbol}`);
      } else if (attrs.type === "unresolved-caip19") {
        return state.write(`$${attrs.caip19}`);
      }
    },
  },
  {
    bold: {
      open: "**",
      close: "**",
      mixable: true,
      expelEnclosingWhitespace: true,
    },
    italic: {
      open: "*",
      close: "*",
      mixable: true,
      expelEnclosingWhitespace: true,
    },
    link: {
      open: "[",
      close(state, mark) {
        return `](${mark.attrs.href})`;
      },
    },
  },
);
