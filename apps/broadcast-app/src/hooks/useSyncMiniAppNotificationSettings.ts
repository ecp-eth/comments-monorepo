import { useAuth, useAuthProtect } from "@/components/auth-provider";
import { useMiniAppContext } from "./useMiniAppContext";
import { useSetMiniAppNotificationsStatus } from "./useSetMiniAppNotificationsStatus";
import { useEffect } from "react";

export function useSyncMiniAppNotificationSettings() {
  const auth = useAuth();
  const miniAppContext = useMiniAppContext();

  const {
    mutateAsync: setNotificationSettings,
    error: setNotificationSettingsError,
  } = useSetMiniAppNotificationsStatus();

  useAuthProtect(setNotificationSettingsError);

  useEffect(() => {
    if (!auth.isLoggedIn) {
      return;
    }

    // sync notifications state to the server, this is just to keep track of their state
    // since we are using a neynar as webhook then we don't have a direct way to know their state
    if (!miniAppContext.isInMiniApp) {
      return;
    }

    setNotificationSettings({
      miniAppContext,
      notificationDetails: miniAppContext.client.notificationDetails,
    });
  }, [miniAppContext, setNotificationSettings, auth.isLoggedIn]);
}
