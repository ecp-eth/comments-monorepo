import { cloneElement, Fragment } from "react";
import type {
  IndexerAPICommentReferenceSchemaType,
  IndexerAPICommentReferencesSchemaType,
} from "@ecp.eth/sdk/indexer";

const KEEP_ORIGINAL_TEXT = Symbol("KEEP_ORIGINAL_TEXT");

const URL_REGEX = /https?:\/\/[^\s<>[\]{}|\\^]+/gu;

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
  // we don't need to do Array.from(content) for unicode support because positions of references are
  // already computed as byte offsets respecting unicode
  const chars = content;
  let currentParagraphText = "";
  let currentParagraph: React.ReactElement[] = [];
  let consecutiveNewLines = 0;

  const flushParagraphText = () => {
    if (currentParagraphText.length === 0) {
      return;
    }

    // Process any URLs in the text before flushing
    let lastIndex = 0;
    const textParts: React.ReactElement[] = [];
    let text = "";

    // Reset the regex lastIndex since we're using the 'g' flag
    URL_REGEX.lastIndex = 0;

    let match: RegExpExecArray | null;

    while ((match = URL_REGEX.exec(currentParagraphText)) !== null) {
      const matchStart = match.index;
      const matchEnd = URL_REGEX.lastIndex;

      if (matchStart > 0) {
        text += currentParagraphText.slice(lastIndex, matchStart);
      }

      // Add the URL as a link
      const url = match[0];

      // flush if there is any text before the url
      textParts.push(<Fragment>{text}</Fragment>);
      text = "";

      textParts.push(
        <a
          className="font-medium underline"
          href={url}
          rel="noopener noreferrer"
          target="_blank"
        >
          {url}
        </a>,
      );

      lastIndex = matchEnd;
    }

    // Add any remaining text
    if (lastIndex < currentParagraphText.length) {
      textParts.push(
        <Fragment>{currentParagraphText.slice(lastIndex)}</Fragment>,
      );
    }

    if (textParts.length > 0) {
      currentParagraph.push(...textParts);
    }

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

  for (let i = 0; i < chars.length; i++) {
    const char = chars[i];
    const reference = referencesByPosition.get(i);

    if (reference) {
      const renderer = referenceRenderers[reference.type] as
        | ReferenceRenderer<typeof reference>
        | undefined;

      if (renderer) {
        const result = renderer(reference);

        if (result !== KEEP_ORIGINAL_TEXT) {
          i = reference.position.end - 1;
          flushParagraphText();
          currentParagraph.push(result);

          continue;
        }
      }
    }

    if (char === "\n" || char === "\r") {
      // skip the \r in \r\n
      if (char === "\r" && chars[i + 1] === "\n") {
        i++;
      }

      consecutiveNewLines++;

      if (consecutiveNewLines === 1) {
        flushParagraph();
      }
    } else {
      consecutiveNewLines = 0;
      currentParagraphText += char;
    }
  }

  flushParagraph();

  return <Fragment>{elements}</Fragment>;
}
