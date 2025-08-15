import { publicEnv } from "@/env/public";
import { sdk } from "@farcaster/miniapp-sdk";
import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { z } from "zod";
import { useMiniAppContext } from "./useMiniAppContext";
import { useRemoveChannelFromDiscoverQuery } from "@/queries/discover-channels";
import { useUpdateChannelInChannelQuery } from "@/queries/channel";
import { toast } from "sonner";
import type { Channel } from "@/api/schemas";
import { useAddERC721RecordToPrimaryList } from "./efp/useAddERC721RecordToPrimaryList";

export class AlreadySubscribedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AlreadySubscribedError";
  }
}

const responseSchema = z.object({
  channelId: z.coerce.bigint(),
  notificationsEnabled: z.boolean(),
});

type Response = z.infer<typeof responseSchema>;

type UseSubscribeToChannelOptions = {
  channel: Channel;
} & Omit<
  UseMutationOptions<Response, Error, void>,
  "mutationFn" | "onSuccess" | "onError"
>;

export function useSubscribeToChannel({
  channel,
  ...options
}: UseSubscribeToChannelOptions) {
  const miniAppContext = useMiniAppContext();
  const updateChannelInChannelQuery = useUpdateChannelInChannelQuery();
  const removeChannelFromDiscoverQuery = useRemoveChannelFromDiscoverQuery();
  const { mutateAsync: addERC721RecordToPrimaryList } =
    useAddERC721RecordToPrimaryList({
      channelId: channel.id,
    });

  return useMutation({
    ...options,
    mutationFn: async () => {
      console.log(await addERC721RecordToPrimaryList());

      // @todo optimistically update the queries so pretend that the subscription is created
      // because that is created on the backend during the indexing. Then we should send an information
      // that user wants to be notified about new posts on the channel.
      if (!miniAppContext.isInMiniApp) {
        throw new Error(
          "You need to be in a mini app to subscribe to a channel",
        );
      }

      let notificationsEnabled = !!miniAppContext.client.notificationDetails;

      if (!miniAppContext.client.added) {
        const result = await sdk.actions.addMiniApp();

        notificationsEnabled = !!result.notificationDetails;
      }

      const response = await fetch(
        `/api/indexer/api/apps/${publicEnv.NEXT_PUBLIC_APP_SIGNER_ADDRESS}/channels/${channel.id}/subscribe`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          // @todo send also fid and notifications enabled if they are available, otherwise don't sent them and just subscribe
          // @todo change database structure to not isolate data per app because indexer will process list events and create subscriptions automatically
          // so we will need to wait until the transaction is mined and when the subscription is available in our api
          // then we can update it with notification settings
          // so by default we will check if the channel subscription for current user exists after the transaction is processed
          body: JSON.stringify({ notificationsEnabled }),
        },
      );

      if (response.status === 409) {
        throw new AlreadySubscribedError(
          `You are already subscribed to channel ${channel.name}`,
        );
      }

      if (!response.ok) {
        console.error(
          `Failed to subscribe to channel:\n\nStatus: ${response.status}\n\nResponse: ${await response.text()}`,
        );

        throw new Error("Server returned invalid response");
      }

      const responseData = await responseSchema
        .promise()
        .parse(response.json());

      return responseData;
    },
    onError(error) {
      if (error instanceof AlreadySubscribedError) {
        toast.error(`You are already subscribed to channel ${channel.name}`);
      } else {
        toast.error(`Failed to subscribe to channel: ${error.message}`);
      }
    },
    onSuccess(data) {
      toast.success(`Subscribed to channel ${channel.name}`);

      removeChannelFromDiscoverQuery(channel.id);

      updateChannelInChannelQuery(channel.id, {
        isSubscribed: true,
        notificationsEnabled: data.notificationsEnabled,
      });
    },
  });
}
