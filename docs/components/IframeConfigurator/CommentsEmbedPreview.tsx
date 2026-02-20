import { Hex } from "@ecp.eth/sdk/core";
import {
  CommentsEmbed,
  CommentsByAuthorEmbed,
  CommentsByChannelEmbed,
  CommentsByRepliesEmbed,
  createCommentsEmbedURL,
  type EmbedConfigSchemaInputType,
} from "@ecp.eth/sdk/embed";
import { DEFAULT_CONFIG } from "./constants";
import { CircleX, Info } from "lucide-react";
import fastDeepEqual from "fast-deep-equal";

export default function CommentsEmbedPreview({
  embedUri,
  source,
  config,
}: {
  embedUri: string | undefined;
  config: EmbedConfigSchemaInputType;
  source:
    | { targetUri: string }
    | { author: Hex }
    | { commentId: Hex }
    | { channelId: string };
}) {
  if (typeof window === "undefined" || !embedUri) {
    return null;
  }

  try {
    // this just validates the config
    createCommentsEmbedURL({
      embedUri,
      source,
      config: fastDeepEqual(config, DEFAULT_CONFIG) ? undefined : config,
    });

    if ("targetUri" in source) {
      return (
        <CommentsEmbed uri={source.targetUri} embedUri={embedUri} {...config} />
      );
    }

    if ("author" in source) {
      return (
        <CommentsByAuthorEmbed
          author={source.author}
          embedUri={embedUri}
          {...config}
        />
      );
    }

    if ("channelId" in source) {
      if (source.channelId == null) {
        throw new Error("Invalid source");
      }

      return (
        <CommentsByChannelEmbed
          channelId={source.channelId}
          embedUri={embedUri}
          {...config}
        />
      );
    }

    return (
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
