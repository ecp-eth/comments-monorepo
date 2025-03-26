import { useEffect, useRef, useState } from "react";
import { AppState } from "react-native";

export function useAppForegrounded() {
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
        }
        if (
          appState.current === "active" &&
          nextAppState.match(/inactive|background/)
        ) {
          setAppIsInForeground(false);
        }
        appState.current = nextAppState;
      }
    );

    return () => handler.remove();
  }, []);

  return appIsInForeground;
}

export default useAppForegrounded;
