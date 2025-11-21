import { wrap } from "comlink";
import { INativeExposedCom } from "../editor.type";

export const webViewMessageEventEndpoint = {
  addEventListener(eventName: string, callback: (event: unknown) => void) {
    window.addEventListener(eventName, (event) => {
      return callback({
        origin: "native",
        data:
          "data" in event
            ? typeof event.data === "string"
              ? JSON.parse(event.data)
              : event.data
            : undefined,
      });
    });
  },
  removeEventListener(eventName: string, callback: (event: unknown) => void) {
    window.removeEventListener(eventName, callback);
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
