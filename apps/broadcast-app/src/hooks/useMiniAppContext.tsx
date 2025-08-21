import {
  sdk,
  type MiniAppNotificationDetails,
  type Context,
} from "@farcaster/miniapp-sdk";
import { createContext, useContext, useEffect, useState } from "react";
import { useSetMiniAppNotificationsStatus } from "./useSetMiniAppNotificationsStatus";
import { useAuthProtect } from "@/components/auth-provider";

export type MiniAppContext =
  | ({
      isInMiniApp: true;
    } & Context.MiniAppContext)
  | {
      isInMiniApp: false;
    };

export const miniAppContext = createContext<MiniAppContext>({
  isInMiniApp: false,
});

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
const context: MiniAppContext = { isInMiniApp: false };

export function useMiniAppContextState() {
  const [state, setState] = useState(context);

  useEffect(() => {
    sdk.context.then((ctx) => {
      // in reality ctx can be undefined if called outside of mini app
      if (ctx) {
        setState({ isInMiniApp: true, ...ctx });
      } else {
        setState({ isInMiniApp: false });
      }
    });

    const onMiniAppAdded = ({
      notificationDetails,
    }: {
      notificationDetails?: MiniAppNotificationDetails;
    }) => {
      setState((prevState) => {
        if (!prevState.isInMiniApp) {
          return prevState;
        }

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
      setState((prevState) => {
        if (!prevState.isInMiniApp) {
          return prevState;
        }

        return {
          ...prevState,
          client: {
            ...prevState.client,
            added: false,
            notificationDetails: undefined,
          },
        };
      });
    };

    sdk.on("miniAppRemoved", onMiniAppRemoved);

    const onNotificationsDisabled = () => {
      setState((prevState) => {
        if (!prevState.isInMiniApp) {
          return prevState;
        }

        return {
          ...prevState,
          client: {
            ...prevState.client,
            notificationDetails: undefined,
            added: false,
          },
        };
      });
    };

    sdk.on("notificationsDisabled", onNotificationsDisabled);

    const onNotificationsEnabled = () => {
      setState((prevState) => {
        if (!prevState.isInMiniApp) {
          return prevState;
        }

        return {
          ...prevState,
          client: {
            ...prevState.client,
            notificationDetails: prevState.client.notificationDetails,
            added: true,
          },
        };
      });
    };

    sdk.on("notificationsEnabled", onNotificationsEnabled);

    return () => {
      sdk.off("miniAppAdded", onMiniAppAdded);
      sdk.off("miniAppRemoved", onMiniAppRemoved);
      sdk.off("notificationsDisabled", onNotificationsDisabled);
      sdk.off("notificationsEnabled", onNotificationsEnabled);
    };
  }, []);

  const {
    mutateAsync: setNotificationSettings,
    error: setNotificationSettingsError,
  } = useSetMiniAppNotificationsStatus();

  useAuthProtect(setNotificationSettingsError);

  useEffect(() => {
    // sync notifications state to the server, this is just to keep track of their state
    // since we are using a neynar as webhook then we don't have a direct way to know their state
    if (!state.isInMiniApp) {
      return;
    }

    setNotificationSettings({
      miniAppContext: state,
      notificationDetails: state.client.notificationDetails,
    });
  }, [state, setNotificationSettings]);

  return state;
}

export function useMiniAppContext() {
  const context = useContext(miniAppContext);

  if (!context) {
    throw new Error("useMiniAppContext must be used within a MiniAppProvider");
  }

  return context;
}
