import { useEffect } from "react";
import useAppForegrounded from "./useAppForegrounded";

export function useAppForegroundedEffect(callback: () => void) {
  const appForegrounded = useAppForegrounded();

  useEffect(() => {
    if (appForegrounded) {
      callback();
    }
  }, [appForegrounded, callback]);
}
