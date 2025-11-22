import React, { useEffect, useRef, useState } from "react";
import { Editor } from "../editor";
import { createRoot } from "react-dom/client";
import {
  EditorProps,
  MessageFromNative,
  MessageFromWebView,
} from "../editor.type";
import { EditorEvents } from "@tiptap/core";

function init() {
  const root = document.getElementById("root");

  if (!root) {
    console.error("Root element not found");
    return;
  }

  log("initializing editor...");

  createRoot(root).render(
    <React.StrictMode>
      <EntryPoint />
    </React.StrictMode>,
  );
}

function EntryPoint() {
  const [editorProps, setEditorProps] = useState<EditorProps>();
  const webviewReadyRef = useRef(false);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const message = JSON.parse(event.data) as MessageFromNative;
      const messageType = message.type;

      log(
        "got message from native",
        "messageType",
        messageType,
        message,
        "message.type",
        String(message.type),
        event,
      );

      switch (messageType) {
        case "set-editor-props":
          log("setting editor props...", message.props);
          setEditorProps(message.props);
          break;
        default:
          messageType satisfies never;
          console.error(`Unknown message type: ${messageType}`);
          break;
      }
    };
    window.addEventListener("message", handler);

    if (!webviewReadyRef.current) {
      webviewReadyRef.current = true;
      postMessage({ type: "webview-ready" });
    }

    log("EntryPoint mounted, listening for messages...");

    return () => {
      window.removeEventListener("message", handler);
      log("EntryPoint unmounted, stopped listening for messages...");
    };
  }, []);

  log("rendering...");

  if (!editorProps) {
    return null;
  }

  log("rendering editor...");

  return (
    <Editor
      {...editorProps}
      onCreate={(createProps: EditorEvents["create"]) => {
        log("editor created");
        editorProps.onCreate?.(createProps);
      }}
    />
  );
}

function postMessage(params: MessageFromWebView) {
  if (
    !("ReactNativeWebView" in window) ||
    typeof window.ReactNativeWebView !== "object" ||
    window.ReactNativeWebView == null ||
    !("postMessage" in window.ReactNativeWebView) ||
    typeof window.ReactNativeWebView.postMessage !== "function"
  ) {
    return;
  }

  window.ReactNativeWebView.postMessage(JSON.stringify(params));
}

function log(...messages: unknown[]) {
  postMessage({
    type: "log",
    message: messages
      .map((message) =>
        typeof message === "string" ? message : JSON.stringify(message),
      )
      .join(" "),
  });
}

init();
