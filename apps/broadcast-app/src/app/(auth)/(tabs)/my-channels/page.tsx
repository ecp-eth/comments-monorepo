"use client";
import { sdk } from "@farcaster/miniapp-sdk";
import { publicEnv } from "@/env/public";
import { useQuery } from "@tanstack/react-query";
import z from "zod";
import { useRouter } from "next/navigation";
import {
  BellRingIcon,
  BellOffIcon,
  Loader2Icon,
  MinusIcon,
} from "lucide-react";
import { MiniAppContext, useMiniAppContext } from "@/hooks/useMiniAppContext";
import { useSetNotificationStatusOnChannel } from "@/hooks/useSetNotificationStatusOnChannel";
import { toast } from "sonner";
import { useUnsubscribeToChannel } from "@/hooks/useUnsubscribeFromChannel";

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

export default function MyChannelsPage() {
  const miniAppContext = useMiniAppContext();
  const router = useRouter();
  const { data, error, status, refetch } = useQuery({
    queryKey: ["my-channels"],
    queryFn: async () => {
      const url = new URL(
        "/api/channels",
        publicEnv.NEXT_PUBLIC_BROADCAST_APP_INDEXER_URL,
      );

      url.searchParams.set("onlySubscribed", "1");

      const response = await sdk.quickAuth.fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch channels: ${response.statusText}`);
      }

      return responseSchema.parse(await response.json());
    },
  });

  if (error) {
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
      <h2>My Channels</h2>

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
              <ChannelNotifications
                miniAppContext={miniAppContext}
                channel={channel}
              />
              <UnsubscribeFromChannelButton channel={channel} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function UnsubscribeFromChannelButton({ channel }: { channel: Channel }) {
  const { mutate: unsubscribe, isPending } = useUnsubscribeToChannel({
    channelId: channel.id,
    onError() {
      toast.error(`Failed to unsubscribe from channel ${channel.name}`);
    },
    onSuccess() {
      toast.success(`Unsubscribed from channel ${channel.name}`);

      // @todo remove channel from the list
    },
  });

  return (
    <button
      disabled={isPending}
      onClick={(event) => {
        // do not navigate to channel
        event.stopPropagation();

        unsubscribe();
      }}
      type="button"
    >
      {isPending ? <Loader2Icon className="animate-spin" /> : <MinusIcon />}{" "}
      Unsubscribe
    </button>
  );
}

function ChannelNotifications({
  miniAppContext,
  channel,
}: {
  miniAppContext: MiniAppContext;
  channel: Channel;
}) {
  const {
    mutateAsync: setNotificationStatus,
    isPending,
    variables,
  } = useSetNotificationStatusOnChannel({
    channelId: channel.id,
    onError(error, variables) {
      if (variables === true) {
        toast.error("Failed to enable notifications");
      } else {
        toast.error("Failed to disable notifications");
      }
    },
    onSuccess(data, variables) {
      if (variables === true) {
        toast.success(`Notifications enabled for channel ${channel.name}`);
      } else {
        toast.success(`Notifications disabled for channel ${channel.name}`);
      }
    },
  });

  if (!miniAppContext.client.added) {
    // request user to add mini app so the notifications are enabled
    return (
      <button
        type="button"
        onClick={(event) => {
          // prevent navigation to channel
          event.stopPropagation();

          sdk.actions.addMiniApp().then(({ notificationDetails }) => {
            setNotificationStatus(!!notificationDetails);
          });
        }}
        title="Enable notifications"
      >
        <BellRingIcon />
      </button>
    );
  }

  if (!miniAppContext.client.notificationDetails) {
    // render a notification button as disabled with a tooltip
    return (
      <button
        type="button"
        disabled
        title="Notifications are not enabled for this app"
      >
        <BellOffIcon />
      </button>
    );
  }

  const isDisabling = variables === false && isPending;
  const isEnabling = variables === true && isPending;

  if (channel.notificationsEnabled) {
    return (
      <button
        type="button"
        disabled={isDisabling}
        onClick={(event) => {
          // prevent navigation to channel
          event.stopPropagation();

          setNotificationStatus(false);
        }}
        title="Disable Notifications"
      >
        {isDisabling ? (
          <Loader2Icon className="animate-spin" />
        ) : (
          <BellOffIcon />
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={variables === true && isPending}
      onClick={(event) => {
        // prevent navigation to channel
        event.stopPropagation();

        setNotificationStatus(true);
      }}
      title="Enable Notifications"
    >
      {isEnabling ? <Loader2Icon className="animate-spin" /> : <BellRingIcon />}
    </button>
  );
}
