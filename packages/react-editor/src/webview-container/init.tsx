import React, { useEffect, useRef, useState } from "react";
import { Editor } from "../editor";
import { createRoot } from "react-dom/client";
import { EditorProps, EditorRef } from "../editor.type";
import { bridgeSuggestionsRenderer } from "./bridge-suggestions-renderer";
import { nativeWrap } from "./native-wrap";
import { log } from "./log";
import { exposeWebViewCom, webViewComSharedContext } from "./web-view-expose";

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
  const editorRef = useRef<EditorRef>(null);

  useEffect(() => {
    log("exposing webview api...");

    webViewComSharedContext.setEditorProps = (props) => {
      setEditorProps(() => props);
    };
    exposeWebViewCom();
    nativeWrap.onWebViewReady();
  }, []);

  useEffect(() => {
    function handleResize() {
      notifyResize();
    }

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(document.body);

    return () => {
      log("disconnecting resize observer");
      resizeObserver.disconnect();
    };
  }, []);

  if (!editorProps) {
    return null;
  }

  const bridgedEditorProps = {
    ...editorProps,
    suggestions: {
      ...editorProps.suggestions,
      // bridge search call to native
      search: async (query: string, char: "@" | "$") => {
        return await nativeWrap.searchSuggestions(query, char);
      },
    },
  };

  return (
    <Editor
      {...bridgedEditorProps}
      ref={(ref) => {
        editorRef.current = ref;
        webViewComSharedContext.editor = ref ?? undefined;
      }}
      onCreate={() => {
        nativeWrap.onEditorCreated();
        notifyResize();
      }}
      onUpdate={() => {
        nativeWrap.onEditorUpdated();
      }}
      onBlur={() => {
        nativeWrap.onEditorBlurred();
      }}
      onEscapePress={() => {
        nativeWrap.onEditorEscapePressed();
      }}
      mentionSuggestionRenderer={bridgeSuggestionsRenderer}
    />
  );
}

const notifyResize = () => {
  // use body.scrollHeight instead of documentElement.scrollHeight
  // because body.scrollHeight gives us the real height of __content__
  // the container on parent window should always sync with the content height
  const height = document.body.scrollHeight;
  nativeWrap.setViewportHeight(height);
};

init();
