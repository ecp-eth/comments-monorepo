"use client";
import { sdk } from "@farcaster/miniapp-sdk";
import { publicEnv } from "@/env/public";
import { useQuery } from "@tanstack/react-query";
import z from "zod";
import { useRouter } from "next/navigation";
import {
  AlreadySubscribedError,
  useSubscribeToChannel,
} from "@/hooks/useSubscribeToChannel";
import { Loader2Icon, PlusIcon } from "lucide-react";
import { toast } from "sonner";

const channelSchema = z.object({
  id: z.coerce.bigint(),
  name: z.string(),
  description: z.string().nullable(),
  isSubscribed: z.boolean(),
  notificationsEnabled: z.boolean(),
});

type Channel = z.infer<typeof channelSchema>;

const responseSchema = z.object({
  results: z.array(channelSchema),
  pageInfo: z.object({
    hasNextPage: z.boolean(),
    nextCursor: z.string().optional(),
  }),
});

export default function DiscoverChannelsPage() {
  const router = useRouter();
  const { data, error, status, refetch } = useQuery({
    queryKey: ["discover-channels"],
    queryFn: async () => {
      const url = new URL(
        "/api/channels",
        publicEnv.NEXT_PUBLIC_BROADCAST_APP_INDEXER_URL,
      );
      const response = await sdk.quickAuth.fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch channels: ${response.statusText}`);
      }

      return responseSchema.parse(await response.json());
    },
  });

  if (error) {
    console.error("Error fetching channels:", error);
    return (
      <div>
        <span>Error during loading</span>

        <button type="button" onClick={() => refetch()}>
          Retry
        </button>
      </div>
    );
  }

  if (status === "pending") {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h2>Discover Channels</h2>

      {data.results.map((channel) => {
        return (
          <div
            key={channel.id.toString()}
            onClick={() => {
              router.push(`/channel/${channel.id}`);
            }}
          >
            <div>{channel.name}</div>
            <div>
              <SubscribeToChannelButton channel={channel} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SubscribeToChannelButton({ channel }: { channel: Channel }) {
  const { mutate: subscribe, isPending } = useSubscribeToChannel({
    channelId: channel.id,
    onSuccess(data, variables, context) {
      toast.success(`Subscribed to channel ${channel.name}`);

      // @todo remove channel from the discover list
    },
    onError(error) {
      if (error instanceof AlreadySubscribedError) {
        toast.error(`You are already subscribed to channel ${channel.name}`);
      } else {
        toast.error(`Failed to subscribe to channel: ${error.message}`);
        console.error("Error subscribing to channel:", error);
      }
    },
  });

  return (
    <button
      disabled={isPending}
      onClick={(event) => {
        // prevent navigation to channel
        event.stopPropagation();

        subscribe();
      }}
      type="button"
    >
      {isPending ? <Loader2Icon className="animate-spin" /> : <PlusIcon />}{" "}
      Subscribe
    </button>
  );
}
