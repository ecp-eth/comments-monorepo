import { LayoutChangeEvent, StyleProp, View, ViewStyle } from "react-native";
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
  useImperativeHandle,
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
import { cssInterop } from "nativewind";
import Animated, {
  useSharedValue,
  withTiming,
  Easing,
} from "react-native-reanimated";

export type { EditorProps, EditorRef } from "./editor.type.js";

type EditorNativeProps = {
  /**
   * Style applies to the top most wrapper of view of native editor
   */
  style?: StyleProp<ViewStyle>;
};

export const Editor = cssInterop(
  function Editor(props: EditorProps & EditorNativeProps) {
    const webViewContainerViewRef = useRef<View>(null);
    const webViewRef = useRef<WebView>(null);
    const webViewComRef = useRef<Remote<IWebViewExposedCom>>(null);
    const [isWebViewReady, setIsWebViewReady] = useState(false);
    const [notifiedHeight, setNotifiedHeight] = useState(0);
    const { onLayout: webViewOnLayout, layout: webViewLayout } =
      useClientRect();
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
    const {
      endpoint: nativeMessageEventEndpoint,
      clearListeners: clearNativeMessageEventListeners,
      emitMessage: emitMessageToNative,
    } = useNativeMessageEventEndpoint(webViewRef);
    const opacity = useSharedValue(0);

    useSyncRef(props, webViewComRef, nativeMessageEventEndpoint);

    // sync props to webview when webview is ready
    useEffect(() => {
      if (!isWebViewReady) {
        return;
      }

      // we don't want to pass ref to the webview, it will be handled by useSyncRef
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { ref: _, ...rest } = props;
      webViewComRef.current?.setProps(rest);
    }, [isWebViewReady, props]);

    useEffect(() => {
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
            setIsWebViewReady(true);
          },
          onEditorCreated: () => {
            opacity.value = withTiming(1, {
              duration: 150,
              easing: Easing.inOut(Easing.ease),
            });
            freshProps.current.onCreate?.();
          },
          onEditorUpdated: () => {
            freshProps.current.onUpdate?.();
          },
          onEditorBlurred: () => {
            freshProps.current.onBlur?.();
            setSuggestionsEnabled(false);
          },
          onEditorEscapePressed: () => {
            freshProps.current.onEscapePress?.();
            setSuggestionsEnabled(false);
          },
          async searchSuggestions(query: string, char: "@" | "$") {
            return await freshProps.current.suggestions.search(query, char);
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
        clearNativeMessageEventListeners();
      };
    }, [
      freshProps,
      freshWebViewLayout,
      nativeMessageEventEndpoint,
      clearNativeMessageEventListeners,
      opacity,
    ]);

    return (
      <>
        <Animated.View
          ref={webViewContainerViewRef}
          style={[
            {
              // the height should be dictated by the editor content
              height: notifiedHeight,
              minHeight: 20,
              minWidth: 20,
            },
            {
              opacity,
            },
            props.style,
          ]}
        >
          <WebView
            ref={webViewRef}
            style={{ flex: 1 }}
            originWhitelist={["*"]}
            scrollEnabled={false}
            webviewDebuggingEnabled={__DEV__}
            onMessage={(event) => {
              emitMessageToNative(JSON.parse(event.nativeEvent.data));
            }}
            source={{ html: `${editorHtml}` }}
            onLayout={webViewOnLayout}
          />
        </Animated.View>
        <Suggestions
          enabled={suggestionsEnabled}
          onDismiss={() => {
            setSuggestionsEnabled(false);
          }}
          command={(item: MentionItem) => {
            webViewComRef.current?.invokeMentionCommand(item);
          }}
          theme={props.theme}
          className={props.theme?.suggestions?.className}
          separatorClassName={
            props.theme?.suggestions_item_separator?.className
          }
          ensRPC={props.ensRPC}
          {...mentionSuggestionProps}
        />
      </>
    );
  },
  {
    className: "style",
  },
);

function useSyncRef(
  props: EditorProps,
  webViewComRef: RefObject<Remote<IWebViewExposedCom> | null>,
  nativeMessageEventEndpoint: ComlinkEndpoint,
) {
  const wrappedWebViewCom = useMemo(
    () => wrap<IWebViewExposedCom>(nativeMessageEventEndpoint),
    [nativeMessageEventEndpoint],
  );
  const proxiedEditorRef = useMemo(() => {
    return new Proxy<EditorRef>({} as EditorRef, {
      get(target, prop) {
        return webViewComRef.current?.[prop as keyof IWebViewExposedCom];
      },
    });
  }, [webViewComRef]);

  useImperativeHandle(props.ref, () => proxiedEditorRef);

  useEffect(() => {
    webViewComRef.current ??= wrappedWebViewCom;
  }, [webViewComRef, wrappedWebViewCom]);
}

function useClientRect() {
  const [layout, setLayout] = useState({ x: 0, y: 0, height: 0, width: 0 });

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    setLayout(event.nativeEvent.layout);
  }, []);

  return { onLayout, layout };
}

function useNativeMessageEventEndpoint(webViewRef: RefObject<WebView | null>) {
  const emitter = useRef<EventEmitter>(null);
  emitter.current ??= new EventEmitter();
  const subscriptionMap =
    useRef<Map<(event: unknown) => void, EventSubscription>>(null);
  subscriptionMap.current ??= new Map<
    (event: unknown) => void,
    EventSubscription
  >();

  const endpoint = useMemo(() => {
    return {
      addEventListener(eventName: string, callback: (event: unknown) => void) {
        if (eventName !== "message") {
          return;
        }

        const sub = emitter.current?.addListener(eventName, callback);
        if (!sub) {
          return;
        }

        subscriptionMap.current?.set(callback, sub);
      },
      removeEventListener(
        eventName: string,
        callback: (event: unknown) => void,
      ) {
        if (eventName !== "message") {
          return;
        }

        subscriptionMap.current?.get(callback)?.remove();
        subscriptionMap.current?.delete(callback);
      },
      postMessage(message: unknown) {
        webViewRef.current?.postMessage(JSON.stringify(message));
      },
    };
  }, [webViewRef]);

  const clearListeners = useCallback(() => {
    // comlink didn't provide a way to unexpose, so we need to manually remove the subscriptions
    subscriptionMap.current?.forEach((sub) => sub.remove());
    subscriptionMap.current?.clear();
  }, []);

  const emitMessage = useCallback((data: string) => {
    emitter.current?.emit("message", {
      origin: "file://webview",
      data,
    });
  }, []);

  return {
    endpoint,
    clearListeners,
    emitMessage,
  };
}
