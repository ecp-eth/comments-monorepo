"use client";

import { publicEnv } from "@/env/public";
import { fetchComments } from "@ecp.eth/sdk/indexer";
import sdk from "@farcaster/miniapp-sdk";
import { useQuery } from "@tanstack/react-query";
import { use } from "react";
import { anvil } from "viem/chains";
import { useChainId } from "wagmi";
import z from "zod";
import { getCommentAuthorNameOrAddress } from "@ecp.eth/shared/helpers";
import { Comment } from "@/components/Comment";

const channelResponseSchema = z.object({
  id: z.coerce.bigint(),
  name: z.string(),
  description: z.string().nullable(),
  isSubscribed: z.boolean(),
  notificationsEnabled: z.boolean(),
});

class ChannelNotFoundError extends Error {
  constructor() {
    super("Channel not found");
    this.name = "ChannelNotFoundError";
  }
}

export default function ChannelPage(props: {
  params: Promise<{ id: string }>;
}) {
  const chainId = useChainId();
  const { id } = use(props.params);

  const channelQuery = useQuery({
    queryKey: ["channel", id],
    queryFn: async () => {
      const channelId = z.coerce.bigint().parse(id);

      const channelUrl = new URL(
        `/api/channels/${channelId}`,
        publicEnv.NEXT_PUBLIC_BROADCAST_APP_INDEXER_URL,
      );
      const channelResponse = await sdk.quickAuth.fetch(channelUrl);

      if (channelResponse.status === 404) {
        throw new ChannelNotFoundError();
      }

      if (!channelResponse.ok) {
        throw new Error(
          `Failed to fetch channel: ${channelResponse.statusText}`,
        );
      }

      return channelResponseSchema.parse(await channelResponse.json());
    },
  });

  const commentsQuery = useQuery({
    enabled: channelQuery.status === "success",
    queryKey: ["channel", id, "comments"],
    queryFn: async () => {
      const channelId = z.coerce.bigint().parse(id);

      const response = await fetchComments({
        chainId: anvil.id,
        channelId,
        apiUrl: publicEnv.NEXT_PUBLIC_INDEXER_URL,
        mode: "flat",
      });

      return {
        // use reversed order because we want to show the newest comments at the bottom
        results: response.results.toReversed(),
        pagination: response.pagination,
        extra: response.extra,
      };
    },
  });

  if (commentsQuery.status === "pending" || channelQuery.status === "pending") {
    return <div>Loading...</div>;
  }

  if (channelQuery.status === "error") {
    if (channelQuery.error instanceof ChannelNotFoundError) {
      return <div>Channel not found</div>;
    }

    return (
      <div>
        Error
        <button onClick={() => channelQuery.refetch()}>Retry</button>
      </div>
    );
  }

  if (commentsQuery.status === "error") {
    return (
      <div>
        Error
        <button onClick={() => commentsQuery.refetch()}>Retry</button>
      </div>
    );
  }

  const channel = channelQuery.data;
  const comments = commentsQuery.data.results;

  return (
    <div>
      <h2>{channel.name}</h2>

      {comments.map((comment) => {
        return <Comment comment={comment} key={comment.id} />;
      })}
    </div>
  );
}
