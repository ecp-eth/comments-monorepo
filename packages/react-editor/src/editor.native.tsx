import { View } from "react-native";
import {
  EditorProps,
  MessageFromNative,
  MessageFromWebView,
} from "./editor.type";
import { WebView } from "react-native-webview";
import editorHtml from "./webview-container/generated/index.html";
import { useRef } from "react";

export function Editor(props: EditorProps) {
  const webViewRef = useRef<WebView>(null);

  const postMessage = (message: MessageFromNative) => {
    webViewRef.current?.postMessage(JSON.stringify(message));
  };

  return (
    <View
      style={{
        flex: 1,
        minHeight: 60,
        minWidth: 40,
      }}
    >
      <WebView
        ref={webViewRef}
        style={{ flex: 1 }}
        originWhitelist={["*"]}
        scrollEnabled={false}
        onMessage={(event) => {
          const message = JSON.parse(
            event.nativeEvent.data,
          ) as MessageFromWebView;

          if (message.type !== "log") {
            console.log("got message from webview", message);
          }

          const messageType = message.type;
          switch (messageType) {
            case "webview-ready":
              postMessage({
                type: "set-editor-props",
                props: props,
              });
              break;
            case "log":
              console.log("[Editor]:", message.message);
              break;
            default:
              messageType satisfies never;
              console.error(`Unknown message type: ${messageType}`);
              break;
          }
        }}
        source={{ html: `${editorHtml}` }}
      />
    </View>
  );
}
