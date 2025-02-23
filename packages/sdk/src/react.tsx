/**
 * Ethereum Comments Protocol SDK for React
 * 
 * @module
 */
import { useMutation } from "@tanstack/react-query";
import { useMemo } from "react";
import { Hex, SignTypedDataParameters } from "viem";
import { useSignTypedData } from "wagmi";
import { COMMENTS_EMBED_DEFAULT_URL } from "./constants.js";
import { EmbedConfigSchema, type EmbedConfigSchemaType } from "./schemas.js";
import * as lz from "lz-ts";

// also export the type for generating docs correctly
export type { EmbedConfigSchemaType } from "./schemas.js";

const { compressToURI } = lz;

/**
 * A hook for repeat gasless transaction pattern
 * 
 * Gasless transaction typically requires 3 steps:
 * 1. prepare typed data to be passed to `signTypedData`, typicall this is also created from server side with an app signature.
 * 2. sign typed data on client side
 * 3. send the dual signed data to server
 * 
 * This hook abstracts these steps and help with the repetition of the pattern.
 * 
 * @category Hooks
 * @param props 
 * @returns 
 */
export function useGaslessTransaction(props: {
  prepareSignTypedDataParams: () => Promise<
    | SignTypedDataParameters
    | {
        signTypedDataParams: SignTypedDataParameters;
        /** Miscellaneous data passed to be passed to sendSignedData */
        variables?: object;
      }
  >;
  signTypedData?: (signTypedDataParams: SignTypedDataParameters) => Promise<Hex>;
  sendSignedData: (args: {
    signature: Hex;
    /** Miscellaneous data passed from prepareSignTypedDataParams */
    variables?: object;
  }) => Promise<Hex>;
}) {
  const { signTypedDataAsync } = useSignTypedData();

  return useMutation({
    mutationFn: async () => {
      const signTypedDataFn = props.signTypedData ?? signTypedDataAsync;

      const prepareResult = await props.prepareSignTypedDataParams();
      const signature = await signTypedDataFn(
        "signTypedDataParams" in prepareResult
          ? prepareResult.signTypedDataParams
          : prepareResult
      );
      const signedData = await props.sendSignedData({
        signature,
        variables: "variables" in prepareResult ? prepareResult.variables : {},
      });
      return signedData;
    },
  });
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
};

/**
 * Renders comments embed iframe for the given uri.
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
}: CommentsEmbedProps) {
  const iframeUri = useMemo(() => {
    const url = new URL(embedUri);

    url.searchParams.set("targetUri", uri);

    if (config && EmbedConfigSchema.parse(config)) {
      url.searchParams.set("config", compressToURI(JSON.stringify(config)));
    }

    return url.toString();
  }, [embedUri, uri, config]);

  return (
    <div {...containerProps}>
      <iframe
        style={{ border: "none", width: "100%", height: "100%" }}
        // allow to override style and other props except src and seamless
        {...iframeProps}
        src={iframeUri}
      ></iframe>
    </div>
  );
}
