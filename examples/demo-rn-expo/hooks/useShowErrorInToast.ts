import { useEffect } from "react";
import Toast from "react-native-toast-message";
import {
  NetworkError,
  RateLimitError,
  ResponseError,
  ResponseSchemaError,
} from "../lib/errors";

export function useShowErrorInToast(error: Error | null) {
  useEffect(() => {
    if (error == null) {
      return;
    }

    Toast.show({
      type: "error",
      text1: getErrorMessage(error),
    });
  }, [error]);
}

function getErrorMessage(error: Error) {
  if (error instanceof NetworkError) {
    return "📡 There seems to be an issue with your network connection. Please try again later.";
  }

  if (error instanceof ResponseError) {
    return "🔧 Our servers are currently experiencing issues. Please try again later.";
  }

  if (error instanceof RateLimitError) {
    return "⏳ We've noticed you're quite active! Please wait a moment before trying again.";
  }

  if (error instanceof ResponseSchemaError) {
    return "🔧 There seems to be an issue with the data we received from the server. Please try upgrade the app or reach out to support.";
  }

  return "❌ " + error.message;
}
