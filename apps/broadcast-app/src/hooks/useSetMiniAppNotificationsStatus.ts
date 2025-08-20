import { useMutation } from "@tanstack/react-query";
import { type MiniAppContext } from "./useMiniAppContext";
import { publicEnv } from "@/env/public";
import { UnauthorizedError } from "@/errors";
import z from "zod";
import type { MiniAppNotificationDetails } from "@farcaster/miniapp-sdk";
import { useAuth, type AuthContextValue } from "@/components/auth-provider";
import { secureFetch } from "@/lib/secure-fetch";

type SetMiniAppNotificationsStatusVariables = {
  miniAppContext: MiniAppContext;
  notificationDetails: MiniAppNotificationDetails | undefined;
};

export function useSetMiniAppNotificationsStatus() {
  const auth = useAuth();

  return useMutation({
    mutationFn: async (variables: SetMiniAppNotificationsStatusVariables) => {
      if (!variables.miniAppContext.isInMiniApp) {
        throw new Error("Not in mini app");
      }

      return await storeNotificationSettings({
        auth,
        notificationsEnabled: variables.miniAppContext.client.added
          ? !!variables.notificationDetails
          : false,
        clientFid: variables.miniAppContext.client.clientFid,
        userFid: variables.miniAppContext.user.fid,
      });
    },
  });
}

const setMiniAppNotificationStatusResponseSchema = z.object({
  notificationsEnabled: z.boolean(),
  userFid: z.number().int().positive(),
});

export type SetMiniAppNotificationStatusResponse = z.infer<
  typeof setMiniAppNotificationStatusResponseSchema
>;

async function storeNotificationSettings({
  auth,
  ...params
}: {
  auth: AuthContextValue;
  notificationsEnabled: boolean;
  clientFid: number;
  userFid: number;
}): Promise<SetMiniAppNotificationStatusResponse> {
  const response = await secureFetch(auth, async ({ headers }) => {
    return fetch(
      `api/apps/${publicEnv.NEXT_PUBLIC_APP_SIGNER_ADDRESS}/farcaster/${params.clientFid}/settings`,
      {
        method: "PUT",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(params),
      },
    );
  });

  if (response.status === 401) {
    throw new UnauthorizedError();
  }

  if (!response.ok) {
    console.error(
      `Failed to subscribe to channel:\n\nStatus: ${response.status}\n\nResponse: ${await response.text()}`,
    );

    throw new Error("Server returned invalid response");
  }

  const responseData = await setMiniAppNotificationStatusResponseSchema
    .promise()
    .parse(response.json());

  return responseData;
}
