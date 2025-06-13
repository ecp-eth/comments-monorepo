import { cloneElement, Fragment } from "react";
import type {
  IndexerAPICommentReferenceURLVideoSchemaType,
  IndexerAPICommentReferenceURLImageSchemaType,
  IndexerAPICommentReferenceURLFileSchemaType,
  IndexerAPICommentReferenceSchemaType,
  IndexerAPICommentReferencesSchemaType,
} from "@ecp.eth/sdk/indexer";

const KEEP_ORIGINAL_TEXT = Symbol("KEEP_ORIGINAL_TEXT");

const URL_REGEX = /^https?:\/\/[^\s<>[\]{}|\\^]+/u;

export type AllowedMediaReferences =
  | IndexerAPICommentReferenceURLVideoSchemaType
  | IndexerAPICommentReferenceURLImageSchemaType
  | IndexerAPICommentReferenceURLFileSchemaType;

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
        className="text-blue-500"
        href={reference.url}
        rel="noopener noreferrer"
        target="_blank"
      >
        @{reference.name}
      </a>
    );
  },
  farcaster(reference) {
    return (
      <a
        className="text-blue-500"
        href={reference.url}
        rel="noopener noreferrer"
        target="_blank"
      >
        @{reference.username}
      </a>
    );
  },
  erc20(reference) {
    return (
      <span
        className="text-blue-500"
        title={reference.name || reference.address}
      >
        ${reference.symbol}
      </span>
    );
  },
};

type RenderToReactProps = {
  content: string;
  references: IndexerAPICommentReferencesSchemaType;
};

type RenderResult = {
  element: React.ReactElement;
  mediaReferences: AllowedMediaReferences[];
};

export function renderToReact({
  content,
  references,
}: RenderToReactProps): RenderResult {
  const { mediaReferences, content: contentWithoutMediaReferences } =
    processMediaReferences(content, references);
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

  while (pos < contentWithoutMediaReferences.length) {
    const codePoint = contentWithoutMediaReferences.codePointAt(pos);

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
      if (char === "\r" && contentWithoutMediaReferences[pos + 1] === "\n") {
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
    const restOfText = contentWithoutMediaReferences.slice(pos);
    const urlMatch = restOfText.match(URL_REGEX);

    if (urlMatch) {
      const url = urlMatch[0];

      flushParagraphText();

      currentParagraph.push(
        <a
          className="underline"
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

  return {
    element: <Fragment>{elements}</Fragment>,
    mediaReferences,
  };
}

type ProcessMediaReferencesResult = {
  mediaReferences: AllowedMediaReferences[];
  /**
   * Content without media references
   */
  content: string;
};

function processMediaReferences(
  content: string,
  references: IndexerAPICommentReferenceSchemaType[],
): ProcessMediaReferencesResult {
  // First, let's identify which references are at the end
  const mediaReferences: AllowedMediaReferences[] = [];

  // Sort references by position
  const sortedReferences = [...references].sort(
    (a, b) => a.position.start - b.position.start,
  );

  let contentEndPos = content.length;

  // Process references from end to start
  for (let i = sortedReferences.length - 1; i >= 0; i--) {
    const reference = sortedReferences[i];

    if (
      reference.type !== "image" &&
      reference.type !== "video" &&
      reference.type !== "file"
    ) {
      continue;
    }

    // Check if this reference is right at the end of remaining content
    // and there's only whitespace after it
    const isAtEnd =
      reference.position.start <= contentEndPos &&
      content.slice(reference.position.end, contentEndPos).trim() === "";

    if (isAtEnd) {
      mediaReferences.unshift(reference);
      contentEndPos = reference.position.start;
    }
  }

  // Trim content to remove the media references
  const trimmedContent = content.slice(0, contentEndPos).trimEnd();

  return {
    content: trimmedContent,
    mediaReferences,
  };
}
