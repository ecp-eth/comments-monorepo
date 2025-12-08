import { wrap } from "comlink";
import { INativeExposedCom } from "../editor.type";

const listeners = new Map<(event: unknown) => void, (event: Event) => void>();

export const webViewMessageEventEndpoint = {
  addEventListener(eventName: string, callback: (event: unknown) => void) {
    const callbackWrapper = (event: Event) => {
      return callback({
        origin: "native",
        data:
          "data" in event
            ? typeof event.data === "string"
              ? JSON.parse(event.data)
              : event.data
            : undefined,
      });
    };
    listeners.set(callback, callbackWrapper);
    window.addEventListener(eventName, callbackWrapper);
  },
  removeEventListener(eventName: string, callback: (event: unknown) => void) {
    const callbackWrapper = listeners.get(callback);
    if (callbackWrapper) {
      window.removeEventListener(eventName, callbackWrapper);
      listeners.delete(callback);
    }
  },
  postMessage(message: unknown) {
    if (
      !("ReactNativeWebView" in window) ||
      typeof window.ReactNativeWebView !== "object" ||
      window.ReactNativeWebView == null ||
      !("postMessage" in window.ReactNativeWebView) ||
      typeof window.ReactNativeWebView.postMessage !== "function"
    ) {
      return;
    }

    window.ReactNativeWebView.postMessage(JSON.stringify(message));
  },
};

export const nativeWrap = createNativeWrap();

export function createNativeWrap() {
  return wrap<INativeExposedCom>(webViewMessageEventEndpoint);
}
