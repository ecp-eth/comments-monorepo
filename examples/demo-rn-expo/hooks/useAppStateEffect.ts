import { useEffect, useRef, useState } from "react";
import { AppState } from "react-native";

export function useAppStateEffect({
  foregrounded,
  backgrounded,
}: {
  foregrounded?: () => void;
  backgrounded?: () => void;
}) {
  const appState = useRef(AppState.currentState);
  const [appIsInForeground, setAppIsInForeground] = useState(true);
  useEffect(() => {
    const handler = AppState.addEventListener(
      "change",
      async (nextAppState) => {
        if (
          appState.current.match(/inactive|background/) &&
          nextAppState === "active"
        ) {
          setAppIsInForeground(true);
          foregrounded?.();
        }
        if (
          appState.current === "active" &&
          nextAppState.match(/inactive|background/)
        ) {
          setAppIsInForeground(false);
          backgrounded?.();
        }
        appState.current = nextAppState;
      },
    );

    return () => handler.remove();
  }, [backgrounded, foregrounded]);

  return appIsInForeground;
}

export default useAppStateEffect;
