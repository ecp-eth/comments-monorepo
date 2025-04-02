/**
 * Ethereum Comments Protocol SDK for React
 *
 * @module
 */
"use client";

import { useMutation } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { Hex, SignTypedDataParameters } from "viem";
import { useSignTypedData } from "wagmi";
import {
  COMMENTS_EMBED_DEFAULT_BY_AUTHOR_URL,
  COMMENTS_EMBED_DEFAULT_URL,
} from "./constants.js";
import {
  EmbedConfigSchema,
  EmbedResizedEventSchema,
  type EmbedConfigSchemaType,
} from "./schemas/index.js";
import * as lz from "lz-ts";

// also export the type for generating docs correctly
export type { EmbedConfigSchemaType } from "./schemas/index.js";

const { compressToURI } = lz;

/**
 * A hook for repeat gasless transaction pattern
 *
 * Gasless transaction typically requires 3 steps:
 * 1. prepare typed data to be passed to `signTypedData`, typically this is also created from server side with an app signature.
 * 2. sign typed data on client side
 * 3. send the dual signed data to server
 *
 * This hook abstracts these steps and help with the repetition of the pattern.
 *
 * @category Hooks
 * @param props
 * @returns
 */
export function useGaslessTransaction<
  TVariables extends object | undefined,
  TReturnValue,
  TInputVariables = void,
  TSignTypedDataParams extends
    SignTypedDataParameters = SignTypedDataParameters,
>(props: {
  prepareSignTypedDataParams: (variables: TInputVariables) => Promise<
    | TSignTypedDataParams
    | {
        signTypedDataParams: TSignTypedDataParams;
        /** Miscellaneous data passed to be passed to sendSignedData */
        variables: TVariables;
      }
  >;
  signTypedData?: (signTypedDataParams: TSignTypedDataParams) => Promise<Hex>;
  sendSignedData: (args: {
    signTypedDataParams: TSignTypedDataParams;
    signature: Hex;
    /** Miscellaneous data passed from prepareSignTypedDataParams */
    variables: TVariables;
  }) => Promise<TReturnValue>;
}) {
  const { signTypedDataAsync } = useSignTypedData();

  return useMutation<TReturnValue, Error, TInputVariables>({
    mutationFn: async (inputVariables) => {
      const signTypedDataFn = props.signTypedData ?? signTypedDataAsync;

      const prepareResult =
        await props.prepareSignTypedDataParams(inputVariables);
      const signTypedDataParams =
        "signTypedDataParams" in prepareResult
          ? prepareResult.signTypedDataParams
          : prepareResult;
      const signature = await signTypedDataFn(
        "signTypedDataParams" in prepareResult
          ? prepareResult.signTypedDataParams
          : prepareResult
      );

      const signedData = await props.sendSignedData({
        signTypedDataParams,
        signature,
        variables:
          "variables" in prepareResult
            ? prepareResult.variables
            : (undefined as TVariables),
      });
      return signedData;
    },
  });
}

/**
 * Parameters for `createCommentsEmbedURL`
 */
export type CreateCommentsEmbedURLParams = {
  /**
   * The URI of the comments embed iframe page.
   */
  embedUri: string;
  /**
   * The target URI or author address to embed comments for.
   */
  source: { targetUri: string } | { author: Hex };
  /**
   * The configuration for the comments embed.
   */
  config?: EmbedConfigSchemaType;
  /**
   * Hide powered by ECP link
   */
  disablePromotion?: boolean;
};

/**
 * Creates a URL for the comments embed iframe.
 *
 * @param options
 *
 * @returns The URL for the comments embed iframe.
 */
export function createCommentsEmbedURL({
  embedUri,
  source,
  config,
  disablePromotion,
}: CreateCommentsEmbedURLParams): string {
  const url = new URL(embedUri);

  if ("targetUri" in source) {
    url.searchParams.set("targetUri", source.targetUri);
  } else {
    url.searchParams.set("author", source.author);
  }

  if (disablePromotion) {
    url.searchParams.set("disablePromotion", "1");
  }

  if (config && EmbedConfigSchema.parse(config)) {
    url.searchParams.set("config", compressToURI(JSON.stringify(config)));
  }

  return url.toString();
}

/**
 * The props for `<CommentsEmbed />` component.
 */
export type CommentsEmbedProps = {
  /**
   * URL of the page to embed comments for. Comments for this uri are rendered in iframe's page.
   */
  uri: string;
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
   * Allows to pass custom configuration to the embed iframe.
   */
  config?: EmbedConfigSchemaType;
  /**
   * Hide powered by ECP link
   *
   * @default false
   */
  disablePromotion?: boolean;
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
 * <CommentsEmbed uri="https://my-blog.tld/article/use-comments" config={{ theme: { mode: 'dark' }}} />
 * ```
 */
export function CommentsEmbed({
  embedUri = COMMENTS_EMBED_DEFAULT_URL,
  uri,
  containerProps,
  iframeProps,
  config,
  disablePromotion,
}: CommentsEmbedProps) {
  const iframeUri = useMemo(() => {
    return createCommentsEmbedURL({
      embedUri,
      source: { targetUri: uri },
      config,
      disablePromotion,
    });
  }, [embedUri, uri, config, disablePromotion]);

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
   * Allows to pass custom configuration to the embed iframe.
   */
  config?: EmbedConfigSchemaType;
  /**
   * Hide powered by ECP link
   *
   * @default false
   */
  disablePromotion?: boolean;
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
  config,
  containerProps,
  iframeProps,
  disablePromotion,
}: CommentsByAuthorEmbedProps) {
  const iframeUri = useMemo(() => {
    return createCommentsEmbedURL({
      embedUri,
      source: { author },
      config,
      disablePromotion,
    });
  }, [embedUri, author, config, disablePromotion]);

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
