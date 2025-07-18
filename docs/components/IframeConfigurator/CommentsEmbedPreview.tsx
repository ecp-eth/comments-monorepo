import { Hex } from "@ecp.eth/sdk/core";
import {
  CommentsEmbed,
  CommentsByAuthorEmbed,
  CommentsByRepliesEmbed,
  createCommentsEmbedURL,
  type EmbedConfigSchemaInputType,
} from "@ecp.eth/sdk/embed";
import { DEFAULT_CONFIG } from "./constants";
import { CircleX, Info } from "lucide-react";

export default function CommentsEmbedPreview({
  embedUri,
  source,
  config,
}: {
  embedUri: string | undefined;
  config: EmbedConfigSchemaInputType;
  source: { targetUri: string } | { author: Hex } | { commentId: Hex };
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
    ) : "author" in source ? (
      <CommentsByAuthorEmbed
        author={source.author}
        embedUri={embedUri}
        {...config}
      />
    ) : (
      <CommentsByRepliesEmbed
        commentId={source.commentId}
        embedUri={embedUri}
        {...config}
      />
    );
  } catch (e) {
    if (e instanceof Error && e.message.includes("Invalid source")) {
      return (
        <div className="flex flex-col items-center justify-center py-6">
          <Info className="w-10 h-10" />
          <span className=" my-5">Missing configuration</span>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center py-6">
        <CircleX stroke="red" className="w-10 h-10" />
        <span className="text-red-500 my-5">Configuration Error</span>
      </div>
    );
  }
}
