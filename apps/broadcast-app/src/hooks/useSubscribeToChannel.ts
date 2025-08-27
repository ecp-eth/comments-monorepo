import { sdk } from "@farcaster/miniapp-sdk";
import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { useMiniAppContext } from "./useMiniAppContext";
import { useUpdateChannelInChannelQuery } from "@/queries/channel";
import { toast } from "sonner";
import type { Channel } from "@/api/schemas";
import { useAddERC721RecordToPrimaryList } from "./efp/useAddERC721RecordToPrimaryList";
import {
  type SetMiniAppNotificationStatusResponse,
  useSetMiniAppNotificationsStatus,
} from "./useSetMiniAppNotificationsStatus";
import { useAuthProtect } from "@/components/auth-provider";
import { formatContractFunctionExecutionError } from "@ecp.eth/shared/helpers";
import { ContractFunctionExecutionError } from "viem";
import { useUpdateChannelInChannelsQuery } from "@/queries/channels";

type UseSubscribeToChannelReturnValue =
  | (SetMiniAppNotificationStatusResponse & { clientFid: number })
  | null;

type UseSubscribeToChannelOptions = {
  channel: Channel;
} & Omit<
  UseMutationOptions<UseSubscribeToChannelReturnValue, Error, void>,
  "mutationFn" | "onSuccess" | "onError"
>;

export function useSubscribeToChannel({
  channel,
  ...options
}: UseSubscribeToChannelOptions) {
  const miniAppContext = useMiniAppContext();
  const updateChannelInChannelsQuery = useUpdateChannelInChannelsQuery();
  const updateChannelInChannelQuery = useUpdateChannelInChannelQuery();
  const { mutateAsync: addERC721RecordToPrimaryList } =
    useAddERC721RecordToPrimaryList({
      channelId: channel.id,
    });

  const {
    mutateAsync: setNotificationSettings,
    error: setNotificationSettingsError,
  } = useSetMiniAppNotificationsStatus();

  useAuthProtect(setNotificationSettingsError);

  return useMutation({
    ...options,
    mutationFn: async () => {
      let response: UseSubscribeToChannelReturnValue = null;

      if (miniAppContext.isInMiniApp) {
        const userFid = miniAppContext.user.fid;
        const clientFid = miniAppContext.client.clientFid;
        let notificationDetails = miniAppContext.client.notificationDetails;

        if (!miniAppContext.client.added) {
          const result = await sdk.actions.addMiniApp();

          notificationDetails = result.notificationDetails;
        }

        // store notification settings
        await setNotificationSettings({
          miniAppContext,
          notificationDetails,
        });

        response = {
          notificationsEnabled: !!notificationDetails,
          userFid,
          clientFid,
        };
      }

      await addERC721RecordToPrimaryList();

      return response;
    },
    onError(error) {
      if (error instanceof ContractFunctionExecutionError) {
        toast.error(formatContractFunctionExecutionError(error));
      } else {
        console.error(error);
        toast.error("Failed to subscribe to channel. Please try again");
      }
    },
    onSuccess(data) {
      toast.success(`Subscribed to channel ${channel.name}`);

      updateChannelInChannelsQuery(channel.id, {
        isSubscribed: true,
        notificationSettings: {
          ...channel.notificationSettings,
          ...(data && {
            [data.clientFid]: data.notificationsEnabled,
          }),
        },
      });

      updateChannelInChannelQuery(channel.id, {
        isSubscribed: true,
        notificationSettings: {
          ...channel.notificationSettings,
          ...(data && {
            [data.clientFid]: data.notificationsEnabled,
          }),
        },
      });
    },
  });
}
