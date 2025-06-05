import { cloneElement, Fragment } from "react";
import type {
  IndexerAPICommentReferenceSchemaType,
  IndexerAPICommentReferencesSchemaType,
} from "@ecp.eth/sdk/indexer";

const KEEP_ORIGINAL_TEXT = Symbol("KEEP_ORIGINAL_TEXT");

const URL_REGEX = /^https?:\/\/[^\s<>[\]{}|\\^]+/u;

type ReferenceRenderer<
  TReference extends IndexerAPICommentReferenceSchemaType,
> = (reference: TReference) => React.ReactElement | typeof KEEP_ORIGINAL_TEXT;

type ReferenceRendererKey = {
  [K in IndexerAPICommentReferenceSchemaType["type"]]: ReferenceRenderer<
    Extract<IndexerAPICommentReferenceSchemaType, { type: K }>
  >;
};

const referenceRenderers: Partial<ReferenceRendererKey> = {
  ens(reference) {
    return (
      <a
        className="font-medium underline"
        href={reference.url}
        rel="noopener noreferrer"
        target="_blank"
      >
        {reference.name}
      </a>
    );
  },
  farcaster(reference) {
    return (
      <a
        className="font-medium underline"
        href={reference.url}
        rel="noopener noreferrer"
        target="_blank"
      >
        {reference.displayName}
      </a>
    );
  },
  erc20(reference) {
    return (
      <a
        className="font-medium underline"
        href={reference.url}
        rel="noopener noreferrer"
        target="_blank"
        title={reference.name || reference.address}
      >
        ${reference.symbol}
      </a>
    );
  },
};

type RenderToReactProps = {
  content: string;
  references: IndexerAPICommentReferencesSchemaType;
};

export function renderToReact({
  content,
  references,
}: RenderToReactProps): React.ReactElement {
  const referencesByPosition: Map<
    number,
    IndexerAPICommentReferenceSchemaType
  > = new Map();

  for (const reference of references) {
    referencesByPosition.set(reference.position.start, reference);
  }

  const elements: React.ReactNode[] = [];
  let currentParagraphText = "";
  let currentParagraph: React.ReactElement[] = [];
  let consecutiveNewLines = 0;

  const flushParagraphText = () => {
    if (currentParagraphText.length === 0) {
      return;
    }

    currentParagraph.push(<Fragment>{currentParagraphText}</Fragment>);
    currentParagraphText = "";
  };

  const flushParagraph = () => {
    flushParagraphText();

    if (currentParagraph.length > 0) {
      elements.push(
        <p key={elements.length}>
          {currentParagraph.map((el, i) => cloneElement(el, { key: i }))}
        </p>,
      );
      currentParagraph = [];
    }
  };

  let pos = 0;

  while (pos < content.length) {
    const codePoint = content.codePointAt(pos);

    if (codePoint == null) {
      throw new Error(`Invalid code point at position ${pos}`);
    }

    const char = String.fromCodePoint(codePoint);
    const reference = referencesByPosition.get(pos);

    if (reference) {
      const renderer = referenceRenderers[reference.type] as
        | ReferenceRenderer<typeof reference>
        | undefined;

      if (renderer) {
        const result = renderer(reference);

        if (result !== KEEP_ORIGINAL_TEXT) {
          flushParagraphText();
          currentParagraph.push(result);
          pos = reference.position.end;

          continue;
        }
      }
    }

    if (char === "\n" || char === "\r") {
      // skip the \r in \r\n
      if (char === "\r" && content[pos + 1] === "\n") {
        pos++;
      }

      pos++;
      consecutiveNewLines++;

      if (consecutiveNewLines === 1) {
        flushParagraph();
      }

      continue;
    }

    consecutiveNewLines = 0;

    // check if there is an url
    const restOfText = content.slice(pos);
    const urlMatch = restOfText.match(URL_REGEX);

    if (urlMatch) {
      const url = urlMatch[0];

      flushParagraphText();

      currentParagraph.push(
        <a
          className="font-medium underline"
          href={url}
          rel="noopener noreferrer"
          target="_blank"
        >
          {url}
        </a>,
      );

      pos += url.length;

      continue;
    }

    currentParagraphText += char;

    // Increment by proper code point length
    pos += codePoint > 0xffff ? 2 : 1;
  }

  flushParagraph();

  return <Fragment>{elements}</Fragment>;
}
