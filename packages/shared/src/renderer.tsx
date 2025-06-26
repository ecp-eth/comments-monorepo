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
> = {
  length: (reference: TReference) => number;
  render: (
    reference: TReference,
  ) => React.ReactElement | typeof KEEP_ORIGINAL_TEXT;
};

type ReferenceRendererKey = {
  [K in IndexerAPICommentReferenceSchemaType["type"]]: ReferenceRenderer<
    Extract<IndexerAPICommentReferenceSchemaType, { type: K }>
  >;
};

const referenceRenderers: Partial<ReferenceRendererKey> = {
  ens: {
    length(reference) {
      return `@${reference.name}`.length;
    },
    render(reference) {
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
  },
  farcaster: {
    length(reference) {
      return `@${reference.fname}`.length;
    },
    render(reference) {
      return (
        <a
          className="text-blue-500"
          href={reference.url}
          rel="noopener noreferrer"
          target="_blank"
        >
          @{reference.fname}
        </a>
      );
    },
  },
  erc20: {
    length(reference) {
      return `$${reference.symbol}`.length;
    },
    render(reference) {
      return (
        <span
          className="text-blue-500"
          title={reference.name || reference.address}
        >
          ${reference.symbol}
        </span>
      );
    },
  },
};

type RenderToReactProps = {
  content: string;
  references: IndexerAPICommentReferencesSchemaType;
  maxLength?: number;
  maxLines?: number;
};

type RenderResult = {
  element: React.ReactElement;
  mediaReferences: AllowedMediaReferences[];
  isTruncated: boolean;
};

export function renderToReact({
  content,
  references,
  maxLength,
  maxLines,
}: RenderToReactProps): RenderResult {
  const { mediaReferences, content: contentWithoutMediaReferences } =
    processMediaReferences(content, references);

  // Adjust reference positions to account for removed media references
  const adjustedReferences = references.map((reference) => {
    // Find how many media references were removed before this reference
    const mediaRefsBefore = mediaReferences.filter(
      (mediaRef) => mediaRef.position.start < reference.position.start,
    );

    // Calculate the total length of removed media references
    const removedLength = mediaRefsBefore.reduce((total, mediaRef) => {
      return total + (mediaRef.position.end - mediaRef.position.start);
    }, 0);

    return {
      ...reference,
      position: {
        start: reference.position.start - removedLength,
        end: reference.position.end - removedLength,
      },
    };
  });

  const referencesByPosition: Map<
    number,
    IndexerAPICommentReferenceSchemaType
  > = new Map();

  for (const reference of adjustedReferences) {
    referencesByPosition.set(reference.position.start, reference);
  }

  const elements: React.ReactNode[] = [];
  let currentParagraphText = "";
  let currentParagraph: React.ReactElement[] = [];
  let consecutiveNewLines = 0;
  let currentRenderedLength = 0;
  let currentRenderedLines = 0;
  let isTruncated = false;

  const flushParagraphText = () => {
    if (
      isTruncated &&
      (currentParagraph.length > 0 || currentParagraphText.length > 0)
    ) {
      currentParagraphText = currentParagraphText.trim() + "...";
    }

    if (currentParagraphText.length === 0) {
      return;
    }

    currentParagraph.push(<Fragment>{currentParagraphText}</Fragment>);
    currentParagraphText = "";
  };

  const flushParagraph = () => {
    flushParagraphText();

    currentRenderedLines++;

    if (currentParagraph.length > 0) {
      elements.push(
        <p key={elements.length}>
          {currentParagraph.map((el, i) => cloneElement(el, { key: i }))}
        </p>,
      );
      currentParagraph = [];
    }
  };

  const shouldBeTruncated = (nextChunkLength: number) => {
    if (maxLength && currentRenderedLength + nextChunkLength > maxLength) {
      return true;
    }

    if (maxLines && currentRenderedLines >= maxLines) {
      return true;
    }

    return false;
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
        const result = renderer.render(reference);

        if (result !== KEEP_ORIGINAL_TEXT) {
          const referenceLength = renderer.length(reference);

          if (shouldBeTruncated(referenceLength)) {
            isTruncated = true;
            break;
          }

          flushParagraphText();

          currentParagraph.push(result);
          currentRenderedLength += referenceLength;
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

      if (shouldBeTruncated(url.length)) {
        isTruncated = true;
        break;
      }

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

      currentRenderedLength += url.length;
      pos += url.length;

      continue;
    }

    if (shouldBeTruncated(1)) {
      isTruncated = true;
      break;
    }

    currentParagraphText += char;
    currentRenderedLength++;

    // Increment by proper code point length
    pos += codePoint > 0xffff ? 2 : 1;
  }

  flushParagraph();

  return {
    element: <Fragment>{elements}</Fragment>,
    mediaReferences,
    isTruncated,
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
      !reference ||
      (reference.type !== "image" &&
        reference.type !== "video" &&
        reference.type !== "file")
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
