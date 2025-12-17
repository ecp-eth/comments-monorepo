import { cloneElement, Fragment, isValidElement } from "react";
import type {
  IndexerAPICommentReferenceURLVideoSchemaType,
  IndexerAPICommentReferenceURLImageSchemaType,
  IndexerAPICommentReferenceURLFileSchemaType,
  IndexerAPICommentReferenceSchemaType,
  IndexerAPICommentReferencesSchemaType,
} from "@ecp.eth/sdk/indexer";
import { never } from "./helpers";

const KEEP_ORIGINAL_TEXT = Symbol("KEEP_ORIGINAL_TEXT");

const URL_REGEX = /^https?:\/\/[^\s<>[\]{}|\\^]+/u;

export type AllowedMediaReferences =
  | IndexerAPICommentReferenceURLVideoSchemaType
  | IndexerAPICommentReferenceURLImageSchemaType
  | IndexerAPICommentReferenceURLFileSchemaType;

export type ReferenceRenderer<
  TNode,
  TReference extends IndexerAPICommentReferenceSchemaType,
> = {
  length: (reference: TReference) => number;
  render: (reference: TReference) => TNode | typeof KEEP_ORIGINAL_TEXT;
};

export type ReferenceRenderers<TNode> = {
  [K in IndexerAPICommentReferenceSchemaType["type"]]: ReferenceRenderer<
    TNode,
    Extract<IndexerAPICommentReferenceSchemaType, { type: K }>
  >;
};

export type ElementRenderers<TNode = string> = {
  paragraph: (children: TNode[]) => TNode;
  text: (text: string) => TNode;
  url: (url: string) => TNode;
};

export type RenderOptions<
  TNode,
  TAllowedReferences extends IndexerAPICommentReferenceSchemaType,
> = {
  content: string;
  references: IndexerAPICommentReferencesSchemaType;
  maxLength?: number;
  maxLines?: number;
  /**
   * Custom renderers for specific reference types
   *
   * if provided it will use only the provided renderers
   */
  renderers: Partial<ReferenceRenderers<TNode>>;
  elementRenderers: ElementRenderers<TNode>;
  /**
   * Custom function to process media references, returned media references
   *
   * @param references - The references to process
   * @returns The processed media references and the content without the media references
   */
  processMediaReferences?: (
    content: string,
    references: IndexerAPICommentReferenceSchemaType[],
  ) => {
    mediaReferences: TAllowedReferences[];
    content: string;
  };
};

/**
 * Result type for render
 */
export type RenderResult<
  TNode,
  TAllowedReferences extends IndexerAPICommentReferenceSchemaType,
> = {
  result: TNode[];
  mediaReferences: TAllowedReferences[];
  isTruncated: boolean;
};

/**
 * Renders the content and references as an array of nodes.
 *
 * @param options - The options for the renderer
 * @returns The rendered node, media references and if the content was truncated
 */
export function render<
  TNode,
  TAllowedReferences extends IndexerAPICommentReferenceSchemaType,
>({
  content,
  references,
  maxLength,
  maxLines,
  renderers,
  elementRenderers,
  processMediaReferences,
}: RenderOptions<TNode, TAllowedReferences>): RenderResult<
  TNode,
  TAllowedReferences
> {
  const { mediaReferences, content: contentWithoutMediaReferences } =
    processMediaReferences
      ? processMediaReferences(content, references)
      : { content, mediaReferences: references };

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

  const elements: TNode[] = [];
  let currentParagraphText = "";
  let currentParagraph: TNode[] = [];
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

    currentParagraph.push(elementRenderers.text(currentParagraphText));
    currentParagraphText = "";
  };

  const flushParagraph = () => {
    flushParagraphText();

    currentRenderedLines++;

    if (currentParagraph.length > 0) {
      elements.push(elementRenderers.paragraph(currentParagraph));
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

    // break on new line and merge consecutive new lines
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

    const reference = referencesByPosition.get(pos);

    if (reference) {
      const renderer = renderers[reference.type] as
        | ReferenceRenderer<TNode, typeof reference>
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

      currentParagraph.push(elementRenderers.url(url));

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
    result: elements,
    mediaReferences: mediaReferences as TAllowedReferences[],
    isTruncated,
  };
}

/**
 * Reference renderers for React
 */
export const reactReferenceRenderers: Partial<
  ReferenceRenderers<React.ReactElement>
> = {
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

/**
 * Helper function to hash a string
 * @param str - The string to hash
 * @returns The hashed string
 */
export function hashKey(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0; // Convert to 32bit int
  }
  return (hash >>> 0).toString(36); // unsigned
}

/**
 * Helper function to generate a key for a React element
 * @param element - The element to generate a key for
 * @returns The key for the element
 */
export function generateKey(
  element:
    | React.ReactElement<unknown, string | React.JSXElementConstructor<unknown>>
    | string,
): undefined | string {
  if (typeof element === "string") {
    return hashKey(element);
  }

  if (element.key) {
    return element.key;
  }

  if (
    typeof element.props === "object" &&
    element.props != null &&
    "children" in element.props
  ) {
    if (typeof element.props.children === "string") {
      return hashKey(element.props.children);
    }

    if (
      typeof element.props.children === "object" &&
      element.props.children != null &&
      Array.isArray(element.props.children)
    ) {
      return element.props.children
        .map((child: unknown, index: number): undefined | string => {
          if (typeof child !== "string" && !isValidElement(child)) {
            return;
          }
          return generateKey(child) ?? `key-inner-${index.toString()}`;
        })
        .filter(Boolean)
        .join("-");
    }
  }

  console.warn("No key found for element", element);

  return;
}

/**
 * Element renderers for React
 */
class ReactElementRenderers implements ElementRenderers<React.ReactElement> {
  private keyIdSeed = 0;
  constructor(private readonly keySet: Set<string> = new Set()) {}
  paragraph(children: React.ReactElement[]): React.ReactElement {
    const childKeys = children.map((child) => {
      let key = generateKey(child) ?? this.getNewKeyId();
      while (this.keySet.has(key)) {
        key = key + "-" + this.getNewKeyId();
      }
      this.keySet.add(key);
      return key;
    });
    const paragraphKey = childKeys.join("-");

    return (
      <p key={paragraphKey}>
        {children.map((el, i) =>
          cloneElement(el, {
            key: childKeys[i],
          }),
        )}
      </p>
    );
  }
  text(text: string): React.ReactElement {
    return <Fragment>{text}</Fragment>;
  }
  url(url: string): React.ReactElement {
    return (
      <a
        key={hashKey(url)}
        className="underline"
        href={url}
        rel="noopener noreferrer"
        target="_blank"
      >
        {url}
      </a>
    );
  }
  private getNewKeyId() {
    return `temp-key-id-${++this.keyIdSeed}`;
  }
}

/**
 * Result type for renderToReact
 */
export type RenderToReactResult = Omit<
  RenderResult<React.ReactElement, AllowedMediaReferences>,
  "result"
> & {
  element: React.ReactElement;
};

/**
 * Renders the content to a React element
 *
 * @param options - The options for the renderer
 * @returns The rendered element, media references and if the content was truncated
 */
export function renderToReact(
  options: Omit<
    RenderOptions<React.ReactElement, AllowedMediaReferences>,
    "renderers" | "elementRenderers" | "processMediaReferences"
  >,
): RenderToReactResult {
  const reactElementRenderers = new ReactElementRenderers();
  const { result, mediaReferences, isTruncated } = render<
    React.ReactElement,
    AllowedMediaReferences
  >({
    ...options,
    renderers: reactReferenceRenderers,
    elementRenderers: reactElementRenderers,
    processMediaReferences,
  });

  return {
    element: <Fragment>{result}</Fragment>,
    mediaReferences,
    isTruncated,
  };
}

/**
 * Reference renderers for markdown
 */
export const markdownReferenceRenderers: Partial<ReferenceRenderers<string>> = {
  ens: {
    length(reference) {
      return `@${reference.name}`.length;
    },
    render(reference) {
      return `[@${reference.name}](${reference.url})`;
    },
  },
  farcaster: {
    length(reference) {
      return `@${reference.fname}`.length;
    },
    render(reference) {
      return `[@${reference.fname}](${reference.url})`;
    },
  },
  erc20: {
    length(reference) {
      return `$${reference.symbol}`.length;
    },
    render(reference) {
      return `$${reference.symbol}`;
    },
  },
  image: {
    length(reference) {
      return reference.url.length;
    },
    render(reference) {
      return `![Image](${reference.url})`;
    },
  },
  video: {
    length(reference) {
      return reference.url.length;
    },
    render(reference) {
      return `![Video](${reference.url})`;
    },
  },
  file: {
    length(reference) {
      return reference.url.length;
    },
    render(reference) {
      return `[${reference.url}](${reference.url})`;
    },
  },
  webpage: {
    length(reference) {
      return reference.url.length;
    },
    render(reference) {
      return `[${reference.url}](${reference.url})`;
    },
  },
};

/**
 * Element renderers for markdown
 */
export const markdownElementRenderers: ElementRenderers<string> = {
  paragraph(children) {
    return children.join("").trim() + "\n\n";
  },
  text(text) {
    return text;
  },
  url(url) {
    return `[${url}](${url})`;
  },
};

export type RenderToMarkdownResult = Omit<
  RenderResult<string, IndexerAPICommentReferenceSchemaType>,
  "result"
> & {
  result: string;
};

/**
 * Renders the content to a markdown string
 *
 * @param options - The options for the renderer
 * @returns The rendered markdown string, media references and if the content was truncated
 */
export function renderToMarkdown(
  options: Omit<
    RenderOptions<string, IndexerAPICommentReferenceSchemaType>,
    "renderers" | "elementRenderers" | "processMediaReferences"
  > & {
    elementRenderers?: Partial<
      RenderOptions<
        string,
        IndexerAPICommentReferenceSchemaType
      >["elementRenderers"]
    >;
  },
): RenderToMarkdownResult {
  const { result, mediaReferences, isTruncated } = render<
    string,
    IndexerAPICommentReferenceSchemaType
  >({
    ...options,
    renderers: markdownReferenceRenderers,
    elementRenderers: {
      ...markdownElementRenderers,
      ...options.elementRenderers,
    },
    processMediaReferences(content) {
      return {
        content,
        mediaReferences: [], // swallow all media references because we are rendering everything to a string
      };
    },
  });

  return {
    result: result.join(""),
    mediaReferences,
    isTruncated,
  };
}

export type ProcessMediaReferencesResult = {
  mediaReferences: AllowedMediaReferences[];
  /**
   * Content without media references
   */
  content: string;
};

/**
 * Helper function to process media references from the content.
 *
 * The resultig content will be stripped of any media references that are at the end of the content.
 *
 * @param content - The content to process
 * @param references - The references to process
 * @returns The processed content and media references
 */
export function processMediaReferences(
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
