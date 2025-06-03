import { cloneElement, Fragment } from "react";
import type {
  IndexerAPICommentReferenceSchemaType,
  IndexerAPICommentReferencesSchemaType,
} from "@ecp.eth/sdk/indexer";

const KEEP_ORIGINAL_TEXT = Symbol("KEEP_ORIGINAL_TEXT");

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
      <a href={reference.url} rel="noopener noreferrer" target="_blank">
        {reference.name}
      </a>
    );
  },
  farcaster(reference) {
    return (
      <a href={reference.url} rel="noopener noreferrer" target="_blank">
        {reference.displayName}
      </a>
    );
  },
  erc20(reference) {
    return (
      <a
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
  const chars = Array.from(content); // respect unicode
  let currentParagraphText = "";
  let currentParagraph: React.ReactElement[] = [];
  let consecutiveNewLines = 0;

  const flushParagraphText = () => {
    if (currentParagraphText.length > 0) {
      currentParagraph.push(<Fragment>{currentParagraphText}</Fragment>);
      currentParagraphText = "";
    }
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
