import { MarkdownParser, MarkdownSerializer } from "prosemirror-markdown";
import { Schema } from "prosemirror-model";
import MarkdownIt from "markdown-it";
import type { TokenItem } from "../extensions/TokenMention";
import type { AddressItem } from "../extensions/AddressMention";
import type { Hex } from "viem";

const md = new MarkdownIt();

const ADDRESS_MENTION_REGEX =
  /^\[@(0x[a-fA-F0-9]{40}|[a-z0-9-]+\.eth)\]\((0x[a-fA-F0-9]{40})\)/;

md.inline.ruler.before("link", "addressMention", (state, silent) => {
  const match = ADDRESS_MENTION_REGEX.exec(state.src.slice(state.pos));

  if (!match) {
    return false;
  }

  if (!silent) {
    const token = state.push("addressMention", "", 0);
    token.content = match[0];

    token.meta = {
      id: match[2] as Hex,
      label: match[1],
      resolved: true,
    } satisfies AddressItem;
  }

  state.pos += match[0].length;

  return true;
});

const EIP_ERC20_TOKEN_REGEX_STRING = "eip155:\\d+/erc20:0x[a-fA-F0-9]{40}";
const SYMBOL_TOKEN_REGEX_STRING = "\\$[A-Z]+";

const TOKEN_MENTION_REGEX = new RegExp(
  `^(${SYMBOL_TOKEN_REGEX_STRING}|\\[(${SYMBOL_TOKEN_REGEX_STRING}|\\$${EIP_ERC20_TOKEN_REGEX_STRING})\\]\\((${EIP_ERC20_TOKEN_REGEX_STRING})\\))`,
);

md.inline.ruler.before("link", "tokenMention", (state, silent) => {
  const match = TOKEN_MENTION_REGEX.exec(state.src.slice(state.pos));

  if (!match) {
    return false;
  }

  if (!silent) {
    const token = state.push("tokenMention", "", 0);
    token.content = match[0];

    if (match[1].startsWith("$")) {
      token.meta = {
        type: "unresolved-symbol",
        symbol: match[1].slice(1),
      } satisfies TokenItem;
    } else if (match[2]?.startsWith("$")) {
      token.meta = {
        type: "resolved",
        id: match[3],
        label: match[2].slice(1),
      } satisfies TokenItem;
    } else {
      token.meta = {
        type: "unresolved-caip19",
        caip19: match[2],
      } satisfies TokenItem;
    }
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
    getAttrs: (tok) => tok.meta as AddressItem,
  },
  tokenMention: {
    node: "tokenMention",
    getAttrs: (tok) => tok.meta as TokenItem,
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

      state.write(`[@${attrs.label}](${attrs.id})`);
    },
    tokenMention(state, node) {
      const attrs = node.attrs as TokenItem;

      if (attrs.type === "resolved") {
        return state.write(`[$${attrs.label}](${attrs.id})`);
      } else if (attrs.type === "unresolved-symbol") {
        return state.write(`$${attrs.symbol}`);
      } else if (attrs.type === "unresolved-caip19") {
        return state.write(`[$${attrs.caip19}](${attrs.caip19})`);
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
