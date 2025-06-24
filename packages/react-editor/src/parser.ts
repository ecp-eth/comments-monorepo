import type { IndexerAPICommentReferencesSchemaType } from "@ecp.eth/sdk/indexer";
import type { JSONContent } from "@tiptap/core";
import type { LinkAttributes, MentionItem } from "./extensions/types.js";

const URL_REGEX = /^(https?:\/\/[^\s<>[\]{}|\\^]+)/u;

export function parse(
  content: string,
  references: IndexerAPICommentReferencesSchemaType,
): JSONContent {
  if (!content) {
    return {
      type: "doc",
      content: [{ type: "paragraph", content: [] }],
    };
  }

  const referenceByPosition = new Map(
    references.map((ref) => [ref.position.start, ref]),
  );

  const parsedContent: Array<JSONContent> = [];
  let currentParagraph = {
    type: "paragraph",
    content: [] as Array<JSONContent>,
  };
  let text = "";

  const flushText = () => {
    if (text) {
      currentParagraph.content.push({
        type: "text",
        text,
      });

      text = "";
    }
  };

  const flushParagraph = () => {
    if (currentParagraph.content.length > 0) {
      parsedContent.push(currentParagraph);
      currentParagraph = {
        type: "paragraph",
        content: [],
      };
    }
  };

  let pos = 0;

  while (pos < content.length) {
    const codePoint = content.codePointAt(pos);

    if (codePoint == null) {
      throw new Error(`Invalid code point at position ${pos}`);
    }

    const char = String.fromCodePoint(codePoint);
    const reference = referenceByPosition.get(pos);

    if (char === "\n" || char === "\r") {
      flushText();
      flushParagraph();

      const nextChar = content[pos + 1];

      // hard break uses empty paragraphs
      parsedContent.push({
        type: "paragraph",
      });

      if (char === "\r" && nextChar === "\n") {
        pos += 1;
      }

      pos += 1;

      continue;
    }

    if (reference) {
      // at the moment we have only inline references
      switch (reference.type) {
        case "ens": {
          flushText();

          currentParagraph.content.push({
            type: "mention",
            attrs: {
              type: "ens",
              address: reference.address,
              name: reference.name,
              url: reference.url,
              avatarUrl: reference.avatarUrl,
            } satisfies MentionItem,
          });

          pos = reference.position.end;

          continue; // go to next position
        }
        case "erc20": {
          flushText();

          // if reference has chainId, we need to find it in the chains array and use that as reference
          // otherwise use just first available reference
          let chain = reference.chainId
            ? reference.chains.find((c) => c.chainId === reference.chainId)
            : undefined;
          chain = chain ?? reference.chains[0]!;

          currentParagraph.content.push({
            type: "mention",
            attrs: {
              type: "erc20",
              address: reference.address,
              name: reference.name,
              symbol: reference.symbol,
              caip19: chain.caip,
              chainId: chain.chainId,
              decimals: reference.decimals,
              logoURI: reference.logoURI,
            } satisfies MentionItem,
          });

          pos = reference.position.end;

          continue; // go to next position
        }
        case "farcaster": {
          flushText();

          currentParagraph.content.push({
            type: "mention",
            attrs: {
              type: "farcaster",
              fname: reference.fname,
              address: reference.address,
              displayName: reference.displayName,
              username: reference.username,
              pfpUrl: reference.pfpUrl,
              url: reference.url,
              fid: reference.fid,
            } satisfies MentionItem,
          });

          pos = reference.position.end;

          continue; // go to next position
        }
        default: {
          // for other reference types, keep the original text
        }
      }
    }

    // reference not found or did not match, check if we have an url at current position
    const restOfContent = content.slice(pos);

    const urlMatch = restOfContent.match(URL_REGEX);

    if (urlMatch) {
      flushText();

      currentParagraph.content.push({
        type: "text",
        text: urlMatch[0],
        marks: [
          {
            type: "link",
            attrs: {
              class: "underline cursor-pointer",
              href: urlMatch[0],
              target: "_blank",
              rel: "noopener noreferrer",
            } satisfies LinkAttributes,
          },
        ],
      });

      pos += urlMatch[0].length;

      continue; // go to next position
    }

    // handle text
    text += char;

    // Increment by proper code point length
    pos += codePoint > 0xffff ? 2 : 1;
  }

  flushText();
  flushParagraph();

  return {
    type: "doc",
    content: parsedContent,
  };
}
