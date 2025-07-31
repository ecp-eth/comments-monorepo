import {
  sdk,
  type MiniAppNotificationDetails,
  type Context,
} from "@farcaster/miniapp-sdk";
import { createContext, useContext, useEffect, useState } from "react";

export type MiniAppContext = Context.MiniAppContext;

export const miniAppContext = createContext<Context.MiniAppContext | undefined>(
  undefined,
);

export function MiniAppProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const context = useMiniAppContextState();

  return (
    <miniAppContext.Provider value={context}>
      {children}
    </miniAppContext.Provider>
  );
}

// This is initial context because we can use use(sdk.context) because it will be resolved only
// when sdk.actions.ready() is called.
const context: MiniAppContext = {
  client: {
    added: false,
    clientFid: -1,
  },
  user: {
    fid: -1,
  },
};

export function useMiniAppContextState() {
  const [state, setState] = useState(context);

  useEffect(() => {
    sdk.context.then((ctx) => {
      setState(ctx);
    });

    const onMiniAppAdded = ({
      notificationDetails,
    }: {
      notificationDetails?: MiniAppNotificationDetails;
    }) => {
      setState((prevState) => {
        return {
          ...prevState,
          client: {
            ...prevState.client,
            notificationDetails:
              notificationDetails ?? prevState.client.notificationDetails,
            added: true,
          },
        };
      });
    };

    sdk.on("miniAppAdded", onMiniAppAdded);

    const onMiniAppRemoved = () => {
      setState((prevState) => ({
        ...prevState,
        client: {
          ...prevState.client,
          added: false,
          notificationDetails: undefined,
        },
      }));
    };

    sdk.on("miniAppRemoved", onMiniAppRemoved);

    const onNotificationsDisabled = () => {
      console.log("onNotificationsDisabled");
      setState((prevState) => ({
        ...prevState,
        client: {
          ...prevState.client,
          notificationDetails: undefined,
        },
      }));
    };

    sdk.on("notificationsDisabled", onNotificationsDisabled);

    const onNotificationsEnabled = () => {
      console.log("onNotificationsEnabled");
      setState((prevState) => ({
        ...prevState,
        client: {
          ...prevState.client,
          notificationDetails: prevState.client.notificationDetails,
        },
      }));
    };

    sdk.on("notificationsEnabled", onNotificationsEnabled);

    return () => {
      sdk.off("miniAppAdded", onMiniAppAdded);
      sdk.off("miniAppRemoved", onMiniAppRemoved);
      sdk.off("notificationsDisabled", onNotificationsDisabled);
      sdk.off("notificationsEnabled", onNotificationsEnabled);
    };
  }, []);

  return state;
}

export function useMiniAppContext() {
  const context = useContext(miniAppContext);

  if (!context) {
    throw new Error("useMiniAppContext must be used within a MiniAppProvider");
  }

  return context;
}
