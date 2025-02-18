import { useMutation } from "@tanstack/react-query";
import { useMemo } from "react";
import { Hex, SignTypedDataParameters } from "viem";
import { useSignTypedData } from "wagmi";
import { COMMENTS_EMBED_DEFAULT_URL } from "./constants.js";
import { EmbedConfigSchema, type EmbedConfigSchemaType } from "./schemas.js";
import { compressToURI } from "lz-ts";

export function useGaslessTransaction(props: {
  prepareSignTypedData: () => Promise<
    | SignTypedDataParameters
    | {
        signTypedDataArgs: SignTypedDataParameters;
        /** Miscellaneous data passed to be passed to sendSignedData */
        variables?: object;
      }
  >;
  signTypedData?: (signTypedDataArgs: SignTypedDataParameters) => Promise<Hex>;
  sendSignedData: (args: {
    signature: Hex;
    /** Miscellaneous data passed from prepareSignTypedData */
    variables?: object;
  }) => Promise<Hex>;
}) {
  const { signTypedDataAsync } = useSignTypedData();

  return useMutation({
    mutationFn: async () => {
      const signTypedDataFn = props.signTypedData ?? signTypedDataAsync;

      const prepareResult = await props.prepareSignTypedData();
      const signature = await signTypedDataFn(
        "signTypedDataArgs" in prepareResult
          ? prepareResult.signTypedDataArgs
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

type CommentsEmbedProps = {
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
