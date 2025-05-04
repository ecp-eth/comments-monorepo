import { Hex } from "@ecp.eth/sdk/core";
import {
  CommentsEmbed,
  CommentsByAuthorEmbed,
  createCommentsEmbedURL,
  type EmbedConfigSchemaInputType,
} from "@ecp.eth/sdk/embed";
import { DEFAULT_CONFIG } from "./constants";

export default function CommentsEmbedPreview({
  embedUri,
  source,
  config,
}: {
  embedUri: string | undefined;
  config: EmbedConfigSchemaInputType;
  source: { targetUri: string } | { author: Hex };
}) {
  if (typeof window === "undefined" || !embedUri) {
    return null;
  }

  try {
    // this just validates the config
    createCommentsEmbedURL({
      embedUri,
      source,
      config:
        JSON.stringify(config) !== JSON.stringify(DEFAULT_CONFIG)
          ? config
          : undefined,
    });

    return "targetUri" in source ? (
      <CommentsEmbed uri={source.targetUri} embedUri={embedUri} {...config} />
    ) : (
      <CommentsByAuthorEmbed
        author={source.author}
        embedUri={embedUri}
        {...config}
      />
    );
  } catch (e) {
    return (
      <div className="flex flex-col gap-2">
        <span className="text-red-500">Could not create show a preview</span>
        <pre className="font-mono w-full">{String(e)}</pre>
      </div>
    );
  }
}
