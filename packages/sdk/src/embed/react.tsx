import { useEffect, useMemo, useRef, useState } from "react";
import { createCommentsEmbedURL } from "./utils.js";
import {
  COMMENTS_EMBED_DEFAULT_BY_AUTHOR_URL,
  COMMENTS_EMBED_DEFAULT_URL,
} from "../constants.js";
import {
  type EmbedConfigSupportedChainIdsSchemaType,
  type EmbedConfigThemeSchemaType,
  EmbedResizedEventSchema,
} from "./schemas/index.js";
import type { Hex } from "../core/schemas.js";

/**
 * The props for `<CommentsEmbed />` component.
 */
export type CommentsEmbedProps = {
  /**
   * URL of the page to embed comments for. Comments for this uri are rendered in iframe's page.
   */
  uri: string | URL;
  /**
   * URL of the comments embed iframe page. This page is rendered in the iframe.
   */
  embedUri?: string;
  /**
   * Allows to pass custom props to iframe's wrapper element
   */
  containerProps?: React.HTMLAttributes<HTMLDivElement>;
  /**
   * Allows to pass custom props to iframe
   */
  iframeProps?: React.IframeHTMLAttributes<HTMLIFrameElement>;
  /**
   * Allows to customise the theme of the embed iframe.
   */
  theme?: EmbedConfigThemeSchemaType;
  /**
   * Hide powered by ECP link
   *
   * @default false
   */
  disablePromotion?: boolean;
  /**
   * The chain id to use for posting comments.
   *
   * @default 8453
   */
  chainId?: EmbedConfigSupportedChainIdsSchemaType;
};

/**
 * Renders comments embed iframe for the given uri.
 *
 * This is client component only.
 *
 * @category Components
 * @param props
 *
 * @example
 * ```tsx
 * <CommentsEmbed uri="https://my-blog.tld/article/use-comments" />
 * ```
 *
 * @example
 * ```tsx
 * // force dark theme
 * <CommentsEmbed uri="https://my-blog.tld/article/use-comments" theme={{ mode: 'dark' }} />
 * ```
 */
export function CommentsEmbed({
  embedUri = COMMENTS_EMBED_DEFAULT_URL,
  uri,
  containerProps,
  iframeProps,
  theme,
  disablePromotion,
  chainId,
}: CommentsEmbedProps) {
  const iframeUri = useMemo(() => {
    return createCommentsEmbedURL({
      embedUri,
      source: { targetUri: uri.toString() },
      config: {
        theme,
        disablePromotion,
        chainId,
      },
    });
  }, [embedUri, uri, theme, disablePromotion, chainId]);

  return (
    <CommentsEmbedInternal
      src={iframeUri}
      containerProps={containerProps}
      iframeProps={iframeProps}
    />
  );
}

export type CommentsByAuthorEmbedProps = {
  /**
   * The author address to filter comments by
   */
  author: Hex;
  /**
   * URL of the comments embed iframe page. This page is rendered in the iframe.
   */
  embedUri?: string;
  /**
   * Allows to pass custom props to iframe's wrapper element
   */
  containerProps?: React.HTMLAttributes<HTMLDivElement>;
  /**
   * Allows to pass custom props to iframe
   */
  iframeProps?: React.IframeHTMLAttributes<HTMLIFrameElement>;
  /**
   * Allows to customise the theme of the embed iframe.
   */
  theme?: EmbedConfigThemeSchemaType;
  /**
   * Hide powered by ECP link
   *
   * @default false
   */
  disablePromotion?: boolean;
  /**
   * The chain id to use for posting comments.
   *
   * @default 8453
   */
  chainId?: EmbedConfigSupportedChainIdsSchemaType;
};

/**
 * Renders comments embed iframe for the given author.
 *
 * This is client component only.
 *
 * @category Components
 * @param props
 *
 * @example
 * ```tsx
 * <CommentsByAuthorEmbed author="0x78397D9D185D3a57D01213CBe3Ec1EbAC3EEc77d" />
 * ```
 *
 * @example
 * ```tsx
 * // force dark theme
 * <CommentsByAuthorEmbed author="0x78397D9D185D3a57D01213CBe3Ec1EbAC3EEc77d" config={{ theme: { mode: 'dark' }}} />
 * ```
 */
export function CommentsByAuthorEmbed({
  embedUri = COMMENTS_EMBED_DEFAULT_BY_AUTHOR_URL,
  author,
  theme,
  containerProps,
  iframeProps,
  disablePromotion,
  chainId,
}: CommentsByAuthorEmbedProps) {
  const iframeUri = useMemo(() => {
    return createCommentsEmbedURL({
      embedUri,
      source: { author },
      config: {
        theme,
        disablePromotion,
        chainId,
      },
    });
  }, [embedUri, author, theme, disablePromotion, chainId]);

  return (
    <CommentsEmbedInternal
      src={iframeUri}
      containerProps={containerProps}
      iframeProps={iframeProps}
    />
  );
}

type CommentsEmbedInternalProps = {
  /**
   * Iframe src
   */
  src: string;
  /**
   * Allows to pass custom props to iframe's wrapper element
   */
  containerProps?: React.HTMLAttributes<HTMLDivElement>;
  /**
   * Allows to pass custom props to iframe
   */
  iframeProps?: React.IframeHTMLAttributes<HTMLIFrameElement>;
};

function CommentsEmbedInternal({
  containerProps,
  iframeProps,
  src,
}: CommentsEmbedInternalProps) {
  const { iframeRef, dimensions } = useIframeDimensionsWatcher(src);

  return (
    <div
      {...containerProps}
      style={{
        transition: "height 0.3s ease",
        ...containerProps?.style,
      }}
    >
      <iframe
        // allow to override style and other props except src and ref
        {...iframeProps}
        style={{
          border: "none",
          width: "100%",
          ...iframeProps?.style,
          ...dimensions,
        }}
        src={src}
        ref={iframeRef}
      ></iframe>
    </div>
  );
}

/**
 * Handles messages about iframe's inner document dimension changes and keeps track of them.
 */
function useIframeDimensionsWatcher(iframeUri: string) {
  const [dimensions, setDimensions] = useState<{
    height: number;
  } | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const origin = useMemo(() => new URL(iframeUri).origin, [iframeUri]);

  useEffect(() => {
    const handleIframeMessage = (event: MessageEvent) => {
      const eventData = EmbedResizedEventSchema.safeParse(event.data);

      if (eventData.success && origin === event.origin) {
        setDimensions({
          height: eventData.data.height,
        });
      }
    };

    window.addEventListener("message", handleIframeMessage);

    return () => {
      window.removeEventListener("message", handleIframeMessage);
    };
  }, [iframeUri, origin]);

  return {
    dimensions,
    iframeRef,
  };
}
