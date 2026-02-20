"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { createCommentsEmbedURL } from "./utils.js";
import {
  COMMENTS_EMBED_DEFAULT_BY_AUTHOR_URL,
  COMMENTS_EMBED_DEFAULT_BY_CHANNEL_URL,
  COMMENTS_EMBED_DEFAULT_BY_REPLIES_URL,
  COMMENTS_EMBED_DEFAULT_URL,
} from "../constants.js";
import {
  type EmbedConfigSchemaInputType,
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
} & EmbedConfigSchemaInputType;

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
  ...rest
}: CommentsEmbedProps) {
  const iframeUri = useMemo(() => {
    return createCommentsEmbedURL({
      embedUri,
      source: { targetUri: uri.toString() },
      config: rest,
    });
  }, [embedUri, uri, rest]);

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
} & EmbedConfigSchemaInputType;

export type CommentsByRepliesEmbedProps = {
  /**
   * The comment ID to filter replies by
   */
  commentId: Hex;
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
} & EmbedConfigSchemaInputType;

export type CommentsByChannelEmbedProps = {
  /**
   * The channel ID to filter comments by.
   */
  channelId: string | bigint;
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
} & Omit<EmbedConfigSchemaInputType, "channelId">;

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
  containerProps,
  iframeProps,
  ...rest
}: CommentsByAuthorEmbedProps) {
  const iframeUri = useMemo(() => {
    return createCommentsEmbedURL({
      embedUri,
      source: { author },
      config: rest,
    });
  }, [embedUri, author, rest]);

  return (
    <CommentsEmbedInternal
      src={iframeUri}
      containerProps={containerProps}
      iframeProps={iframeProps}
    />
  );
}

/**
 * Renders comments embed iframe for replies to a specific comment.
 *
 * This is client component only.
 *
 * @category Components
 * @param props
 *
 * @example
 * ```tsx
 * <CommentsByRepliesEmbed commentId="0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef" />
 * ```
 *
 * @example
 * ```tsx
 * // force dark theme
 * <CommentsByRepliesEmbed commentId="0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef" config={{ theme: { mode: 'dark' }}} />
 * ```
 */
export function CommentsByRepliesEmbed({
  embedUri = COMMENTS_EMBED_DEFAULT_BY_REPLIES_URL,
  commentId,
  containerProps,
  iframeProps,
  ...rest
}: CommentsByRepliesEmbedProps) {
  const iframeUri = useMemo(() => {
    return createCommentsEmbedURL({
      embedUri,
      source: { commentId },
      config: rest,
    });
  }, [embedUri, commentId, rest]);

  return (
    <CommentsEmbedInternal
      src={iframeUri}
      containerProps={containerProps}
      iframeProps={iframeProps}
    />
  );
}

/**
 * Renders comments embed iframe for a specific channel.
 *
 * This is client component only.
 *
 * @category Components
 * @param props
 */
export function CommentsByChannelEmbed({
  embedUri = COMMENTS_EMBED_DEFAULT_BY_CHANNEL_URL,
  channelId,
  containerProps,
  iframeProps,
  ...rest
}: CommentsByChannelEmbedProps) {
  const configKey = JSON.stringify(rest, (_key, value) =>
    typeof value === "bigint" ? value.toString() : (value as unknown),
  );

  const iframeUri = useMemo(() => {
    if (channelId == null) {
      return;
    }

    const normalizedChannelId =
      typeof channelId === "bigint" ? channelId.toString() : channelId.trim();

    if (!normalizedChannelId) {
      return;
    }

    return createCommentsEmbedURL({
      embedUri,
      source: { channelId: normalizedChannelId },
      config: rest,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [embedUri, channelId, configKey]);

  if (!iframeUri) {
    return null;
  }

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
  const { dimensions } = useIframeDimensionsWatcher(src);
  useWalletButtonInterceptor(src);

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
  };
}

/**
 * On mobile the uri scheme cannot be triggered directly within the iframe, so we had to intercept the message and open the link on the container level.
 *
 * p.s. we had to hack rainbowkit to make expose such window message event, check pnpm patch for details.
 */
function useWalletButtonInterceptor(embedUri: string) {
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const origin = new URL(embedUri).origin;

    const handleMessage = (event: MessageEvent) => {
      if (
        event.data.type !== "rainbowkit-wallet-button-mobile-clicked" ||
        origin !== event.origin
      ) {
        return;
      }

      const mobileUri = event.data.uri;

      if (
        mobileUri.toLowerCase().startsWith("javascript:") ||
        mobileUri.toLowerCase().startsWith("data:")
      ) {
        console.warn("Blocked potentially dangerous URI scheme:", mobileUri);
        return;
      }

      if (mobileUri.toLowerCase().startsWith("http")) {
        const link = document.createElement("a");
        link.href = mobileUri;
        link.target = "_blank";
        link.rel = "noreferrer noopener";
        link.click();
      } else {
        window.location.href = mobileUri;
      }
    };

    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [embedUri]);
}
