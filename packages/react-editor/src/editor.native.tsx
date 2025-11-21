import { LayoutChangeEvent, View } from "react-native";
import {
  type EditorProps,
  EditorRef,
  INativeExposedCom,
  IWebViewExposedCom,
} from "./editor.type";
import { WebView } from "react-native-webview";
import editorHtml from "./webview-container/generated/index.html";
import {
  RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import EventEmitter, {
  EventSubscription,
} from "react-native/Libraries/vendor/emitter/EventEmitter";
import {
  expose,
  Remote,
  wrap,
  type Endpoint as ComlinkEndpoint,
} from "comlink";
import { Suggestions } from "./extensions/components/suggestions.native";
import { MentionItem } from "./types";
import { useFreshRef } from "@ecp.eth/shared/hooks/useFreshRef";

export type { EditorProps, EditorRef } from "./editor.type.js";

const emitter = new EventEmitter();
const subscriptionMap = new Map<(event: unknown) => void, EventSubscription>();

export function Editor(props: EditorProps) {
  const webViewContainerViewRef = useRef<View>(null);
  const webViewRef = useRef<WebView>(null);
  const webViewComRef = useRef<Remote<IWebViewExposedCom>>(null);
  const [notifiedHeight, setNotifiedHeight] = useState(0);
  const { onLayout: webViewOnLayout, layout: webViewLayout } = useClientRect();
  const [mentionSuggestionProps, setMentionSuggestionProps] = useState<{
    items: MentionItem[];
    query: string;
    clientRect: DOMRect;
  }>({
    items: [],
    query: "",
    clientRect: new DOMRect(0, 0, 0, 0),
  });
  const [suggestionsEnabled, setSuggestionsEnabled] = useState(false);
  const freshProps = useFreshRef(props);
  const freshWebViewLayout = useFreshRef(webViewLayout);

  const nativeMessageEventEndpoint = useMemo(() => {
    return {
      addEventListener(eventName: string, callback: (event: unknown) => void) {
        if (eventName !== "message") {
          return;
        }

        const sub = emitter.addListener(eventName, callback);
        subscriptionMap.set(callback, sub);
      },
      removeEventListener(
        eventName: string,
        callback: (event: unknown) => void,
      ) {
        if (eventName !== "message") {
          return;
        }

        subscriptionMap.get(callback)?.remove();
        subscriptionMap.delete(callback);
      },
      postMessage(message: unknown) {
        webViewRef.current?.postMessage(JSON.stringify(message));
      },
    };
  }, []);

  useSyncPropsRef(props, webViewComRef, nativeMessageEventEndpoint);

  useEffect(() => {
    const props = freshProps.current;
    expose(
      {
        setViewportHeight: (height: number) => {
          setNotifiedHeight(height);
        },
        log: (message: string) => {
          console.log("[Editor]:", message);
        },
        onWebViewReady: () => {
          console.log("onWebViewReady");
          webViewComRef.current?.setProps(props);
        },
        onEditorCreated: () => {
          props.onCreate?.();
        },
        onEditorUpdated: () => {
          props.onUpdate?.();
        },
        onEditorBlurred: () => {
          props.onBlur?.();
          setSuggestionsEnabled(false);
        },
        onEditorEscapePressed: () => {
          props.onEscapePress?.();
          setSuggestionsEnabled(false);
        },
        async searchSuggestions(query: string, char: "@" | "$") {
          return await props.suggestions.search(query, char);
        },
        onMentionSuggestionStart: ({ items, query, clientRect }) => {
          setSuggestionsEnabled(true);

          webViewContainerViewRef.current?.measureInWindow((x, y) => {
            setMentionSuggestionProps({
              items,
              query,
              clientRect: DOMRect.fromRect({
                x: x + freshWebViewLayout.current.x + clientRect.x,
                y: y + freshWebViewLayout.current.y + clientRect.y,
                height: clientRect.height,
                width: clientRect.width,
              }),
            });
          });
        },
        onMentionSuggestionUpdate: ({ items, query, clientRect }) => {
          webViewContainerViewRef.current?.measureInWindow((x, y) => {
            setMentionSuggestionProps((prev) => ({
              ...prev,
              items,
              query,
              ...(clientRect
                ? {
                    clientRect: DOMRect.fromRect({
                      x: x + freshWebViewLayout.current.x + clientRect.x,
                      y: y + freshWebViewLayout.current.y + clientRect.y,
                      height: clientRect.height,
                      width: clientRect.width,
                    }),
                  }
                : {}),
            }));
          });
        },
        onMentionSuggestionExit: () => {
          setSuggestionsEnabled(false);
        },
      } satisfies INativeExposedCom,
      nativeMessageEventEndpoint,
    );

    return () => {
      // comlink didn't provide a way to unexpose, so we need to manually remove the subscriptions
      subscriptionMap.forEach((sub) => sub.remove());
      subscriptionMap.clear();
    };
  }, [freshProps, nativeMessageEventEndpoint, freshWebViewLayout]);

  return (
    <>
      <View
        ref={webViewContainerViewRef}
        style={{
          height: notifiedHeight || 60,
          minWidth: 40,
        }}
      >
        <WebView
          ref={webViewRef}
          style={{ flex: 1 }}
          originWhitelist={["*"]}
          scrollEnabled={false}
          webviewDebuggingEnabled={true}
          onMessage={(event) => {
            emitter.emit("message", {
              origin: "file://webview",
              data: JSON.parse(event.nativeEvent.data),
            });
          }}
          source={{ html: `${editorHtml}` }}
          onLayout={webViewOnLayout}
        />
      </View>
      <Suggestions
        enabled={suggestionsEnabled}
        onDismiss={() => {
          setSuggestionsEnabled(false);
        }}
        command={(item: MentionItem) => {
          webViewComRef.current?.invokeMentionCommand(item);
        }}
        {...mentionSuggestionProps}
      />
    </>
  );
}

function useSyncPropsRef(
  props: EditorProps,
  webViewComRef: RefObject<Remote<IWebViewExposedCom> | null>,
  nativeMessageEventEndpoint: ComlinkEndpoint,
) {
  const wrappedWebViewCom = useMemo(
    () => wrap<IWebViewExposedCom>(nativeMessageEventEndpoint),
    [nativeMessageEventEndpoint],
  );
  const updatePropsRef = useCallback(() => {
    const bridgeEditorRef = new Proxy<EditorRef>({} as EditorRef, {
      get(target, prop) {
        return webViewComRef.current?.[prop as keyof IWebViewExposedCom];
      },
    });

    if (props.ref) {
      if (typeof props.ref === "function") {
        props.ref(bridgeEditorRef);
      } else {
        props.ref.current = bridgeEditorRef;
      }
    }
  }, [webViewComRef, props]);

  useEffect(() => {
    webViewComRef.current ??= wrappedWebViewCom;

    updatePropsRef();
  }, [webViewComRef, updatePropsRef, wrappedWebViewCom]);

  useEffect(() => {
    if (!props.ref) {
      return;
    }

    updatePropsRef();
  }, [props, props.ref, updatePropsRef]);
}

function useClientRect() {
  const [layout, setLayout] = useState({ x: 0, y: 0, height: 0, width: 0 });

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    setLayout(event.nativeEvent.layout);
  }, []);

  return { onLayout, layout };
}
