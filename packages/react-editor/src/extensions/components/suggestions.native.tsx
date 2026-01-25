import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useContext,
  useMemo,
} from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleProp,
  ViewStyle,
  Animated as RNAnimated,
  OpaqueColorValue,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";
import { createPublicClient, http, type Hex, type PublicClient } from "viem";
import * as chains from "viem/chains";
import type { IndexerAPIAutocompleteERC20SchemaType } from "@ecp.eth/sdk/indexer";
import { getChainById } from "@ecp.eth/shared/helpers";
import { isValidQuery } from "../helpers.js";
import type { MentionItem } from "../types.js";
import { MINIMUM_QUERY_LENGTH } from "../../constants.js";
import { KeyboardAvoidPopUpView } from "../../components/KeyboardAvoidPopUpView.js";
import blo from "blo-png";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { INativeExposedComSuggestionProps } from "../../editor.type.js";
import type { MentionsExtensionTheme } from "../types.js";
import {
  mentionsThemeContext,
  MentionsThemeContextProvider,
} from "../../components/ThemeContextProvider.js";
import { cssInterop } from "nativewind";
import FastImage from "react-native-fast-image";

const ICON_SIZE = 24;
const FONT_SIZE = 12;
const GAP = 8;
const PADDING_VERTICAL = 12;
const PADDING_HORIZONTAL = 20;
const GAP_DROPDOWN_FROM_INPUT_BOTTOM = 14;

export type SuggestionsProps = INativeExposedComSuggestionProps & {
  command: (item: MentionItem) => void;
  enabled: boolean;
  onDismiss: () => void;
  theme?: MentionsExtensionTheme;
  ensRPC?: string;
};

export function Suggestions({ theme, ...rest }: SuggestionsProps) {
  return (
    <CSSInteroppedSuggestions
      className={theme?.suggestionsClassName}
      separatorClassName={theme?.suggestionsItemSeparatorClassName}
      theme={theme}
      {...rest}
    />
  );
}

const CSSInteroppedSuggestions = cssInterop(
  function Suggestions({
    items,
    query,
    clientRect,
    command,
    enabled,
    onDismiss,
    style,
    separatorStyle,
    theme,
    ensRPC,
  }: SuggestionsProps & {
    style?: StyleProp<ViewStyle>;
    separatorStyle?: StyleProp<ViewStyle>;
  }) {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const flatListRef = useRef<FlatList>(null);

    const selectItem = (index: number) => {
      const item = items[index];
      if (item) {
        command(item);
      }
    };

    useEffect(() => setSelectedIndex(0), [items]);

    // Scroll selected item into view
    useEffect(() => {
      if (items.length > 0 && selectedIndex < items.length) {
        flatListRef.current?.scrollToIndex({
          index: selectedIndex,
          animated: true,
          viewPosition: 0.5,
        });
      }
    }, [selectedIndex, items.length]);

    const publicClient = useMemo(
      () =>
        createPublicClient({
          chain: chains.mainnet,
          transport: http(ensRPC),
        }),
      [ensRPC],
    );

    // Show popup if enabled and either query is valid with items, or query is too short (to show continue typing message)
    const shouldShowPopup = enabled && query.length >= 0;
    const hasValidQuery = isValidQuery(query, MINIMUM_QUERY_LENGTH);
    const showContinueTyping = !hasValidQuery;

    const renderItem = ({
      item,
      index,
    }: {
      item: MentionItem;
      index: number;
    }) => {
      return (
        <TouchableOpacity
          onPress={() => selectItem(index)}
          style={{
            padding: 4,
            alignItems: "center",
            gap: 8,
          }}
        >
          {(() => {
            const itemType = item.type;
            switch (itemType) {
              case "ens":
              case "farcaster":
                return (
                  <AccountSuggestion
                    index={index}
                    address={item.address}
                    avatarUrl={
                      item.type === "farcaster" ? item.pfpUrl : item.avatarUrl
                    }
                    name={
                      item.type === "farcaster"
                        ? item.displayName || item.username
                        : item.name
                    }
                    handle={
                      item.type === "farcaster" ? item.fname : item.address
                    }
                    client={publicClient}
                  />
                );

              case "erc20":
                return <ERC20TokenSuggestion index={index} suggestion={item} />;
              default:
                itemType satisfies never;
            }
          })()}
        </TouchableOpacity>
      );
    };

    return (
      <KeyboardAvoidPopUpView
        enabled={shouldShowPopup}
        inputRect={clientRect}
        gap={GAP_DROPDOWN_FROM_INPUT_BOTTOM}
        onDismiss={onDismiss}
      >
        {({ popAbove, maxHeight }) => {
          return shouldShowPopup ? (
            <MentionsThemeContextProvider value={theme ?? {}}>
              <View
                style={[
                  {
                    flex: 1,

                    borderBottomWidth: 1,
                    borderTopWidth: 1,
                    borderColor: "#EFEFEF",

                    backgroundColor: "#FFF",
                  },
                  style,
                ]}
              >
                {showContinueTyping ? (
                  <View
                    style={{
                      paddingVertical: PADDING_VERTICAL,
                      paddingHorizontal: PADDING_HORIZONTAL,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: FONT_SIZE,
                        color: "#6b7280",
                      }}
                      className={theme?.suggestionsContinueTypingClassName}
                    >
                      Continue typing to see ENS name suggestions
                    </Text>
                  </View>
                ) : (
                  <FlatList
                    ref={flatListRef}
                    data={items}
                    renderItem={renderItem}
                    keyExtractor={(item) => `${query}-${item.address}`}
                    style={{
                      flex: 1,
                      flexShrink: 1,
                      maxHeight,
                    }}
                    horizontal={false}
                    onScrollToIndexFailed={(info) => {
                      // Fallback if scroll fails
                      setTimeout(() => {
                        flatListRef.current?.scrollToIndex({
                          index: info.index,
                          animated: true,
                        });
                      }, 100);
                    }}
                    ItemSeparatorComponent={
                      separatorStyle
                        ? () => <View style={separatorStyle} />
                        : undefined
                    }
                    inverted={popAbove}
                  />
                )}
              </View>
            </MentionsThemeContextProvider>
          ) : null;
        }}
      </KeyboardAvoidPopUpView>
    );
  },
  {
    className: "style",
    separatorClassName: "separatorStyle",
  },
);

const ANIMATION_DURATION = 300;
const ANIMATION_DELAY_PER_ITEM = 50;
const SLIDE_DISTANCE = 0; // disabled for now according to discussion

const SuggestionItem = cssInterop(
  function SuggestionItem({
    source,
    title,
    subtitle,
    index,
    style,
    titleStyle,
    subtitleStyle,
    infoStyle,
    avatarStyle,
    address,
  }: {
    /**
     * when `source` is not provided, it is considered the source is still being loaded
     * if `source` is provided, but uri is undefined, it is considered "no source" and a `blo` will be used
     */
    source?: {
      uri?: string;
    };
    title: React.ReactNode;
    subtitle: React.ReactNode;
    index: number;
    style?: StyleProp<ViewStyle>;
    titleStyle?: StyleProp<ViewStyle>;
    subtitleStyle?: StyleProp<ViewStyle>;
    infoStyle?: StyleProp<ViewStyle>;
    avatarStyle?: StyleProp<{
      [K in keyof ViewStyle]: Exclude<
        ViewStyle[K],
        string | RNAnimated.AnimatedNode | OpaqueColorValue
      >;
    }>;
    address: Hex;
  }) {
    const { left, right } = useSafeAreaInsets();
    const opacity = useSharedValue(0);
    const translateX = useSharedValue(SLIDE_DISTANCE);
    const [hasAnimated, setHasAnimated] = useState(false);
    const [hasImageError, setHasImageError] = useState(false);

    const getBlo = useCallback(() => {
      return blo(
        address,
        (typeof avatarStyle === "object" &&
          avatarStyle !== null &&
          "width" in avatarStyle &&
          typeof avatarStyle.width === "number" &&
          avatarStyle.width > 0 &&
          "height" in avatarStyle &&
          typeof avatarStyle.height === "number" &&
          Math.max(avatarStyle.width, avatarStyle.height)) ||
          ICON_SIZE,
      );
    }, [address, avatarStyle]);

    const handleLayout = useCallback(() => {
      if (hasAnimated) return;
      setHasAnimated(true);

      const delay = index * ANIMATION_DELAY_PER_ITEM;

      opacity.value = withDelay(
        delay,
        withTiming(1, {
          duration: ANIMATION_DURATION,
          easing: Easing.out(Easing.ease),
        }),
      );
      translateX.value = withDelay(
        delay,
        withTiming(0, {
          duration: ANIMATION_DURATION,
          easing: Easing.out(Easing.ease),
        }),
      );
    }, [hasAnimated, index, opacity, translateX]);

    const animatedStyle = useAnimatedStyle(() => {
      return {
        opacity: opacity.value,
        transform: [{ translateX: translateX.value }],
      };
    });

    return (
      <Animated.View
        onLayout={handleLayout}
        style={[
          {
            marginLeft: left,
            marginRight: right,
            flex: 1,
            flexDirection: "row",
            flexGrow: 1,
            flexShrink: 0,
            alignItems: "center",
            justifyContent: "flex-start",
            gap: GAP,
            paddingVertical: PADDING_VERTICAL,
            paddingHorizontal: PADDING_HORIZONTAL,
            overflow: "hidden",
          },
          animatedStyle,
          style,
        ]}
      >
        {hasImageError ? (
          <ImageErrorIcon avatarStyle={avatarStyle} />
        ) : source === undefined ? (
          <View
            style={[
              {
                width: ICON_SIZE,
                height: ICON_SIZE,
                borderRadius: ICON_SIZE / 2,
                backgroundColor: "#f3f4f6",
              },
              avatarStyle,
            ]}
          />
        ) : (
          <FastImage
            source={{
              uri: source.uri ?? getBlo(),
            }}
            style={[
              {
                width: ICON_SIZE,
                height: ICON_SIZE,
                borderRadius: ICON_SIZE / 2,
                backgroundColor: "#f3f4f6",
              },
              avatarStyle,
            ]}
            onLoadStart={() => {
              setHasImageError(false);
            }}
            onError={() => {
              setHasImageError(true);
            }}
          />
        )}
        <View
          style={[
            {
              flex: 1,
              minWidth: 0,
            },
            infoStyle,
          ]}
        >
          <Text
            style={[{ fontSize: FONT_SIZE, color: "#6b7280" }, titleStyle]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {title}
          </Text>
          <Text
            style={[{ fontSize: FONT_SIZE, color: "#6b7280" }, subtitleStyle]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {subtitle}
          </Text>
        </View>
      </Animated.View>
    );
  },
  {
    className: "style",
    titleClassName: "titleStyle",
    subtitleClassName: "subtitleStyle",
    infoClassName: "infoStyle",
    avatarClassName: "avatarStyle",
  },
);

type AccountSuggestionProps = {
  index: number;
  address: Hex;
  avatarUrl: string | null | undefined;
  name: string;
  handle: string;
  client: PublicClient;
};

function AccountSuggestion({
  index,
  address,
  avatarUrl,
  name,
  handle,
  client,
}: AccountSuggestionProps) {
  const theme = useContext(mentionsThemeContext);
  const [source, setSource] = useState<{
    uri?: string;
  }>();

  useEffect(() => {
    if (avatarUrl) {
      setSource({
        uri: avatarUrl,
      });
      return;
    }

    client
      .getEnsAvatar({ name })
      .then((avatar) => {
        setSource({
          uri: avatar ?? undefined,
        });
      })
      .catch(() => {
        setSource({
          uri: undefined,
        });
      });
  }, [client, avatarUrl, name]);

  return (
    <SuggestionItem
      index={index}
      source={source}
      title={name}
      subtitle={handle}
      className={theme?.suggestionsItemClassName}
      titleClassName={theme?.suggestionsItemNameClassName}
      subtitleClassName={theme?.suggestionsItemHandleClassName}
      infoClassName={theme?.suggestionsItemInfoClassName}
      avatarClassName={theme?.suggestionsItemAvatarClassName}
      address={address}
    />
  );
}

type ERC20TokenSuggestionProps = {
  index: number;
  suggestion: IndexerAPIAutocompleteERC20SchemaType;
};

function ERC20TokenSuggestion({
  index,
  suggestion,
}: ERC20TokenSuggestionProps) {
  const theme = useContext(mentionsThemeContext);
  const chainName =
    getChainById(suggestion.chainId, Object.values(chains))?.name ??
    "Unknown Chain";

  return (
    <SuggestionItem
      index={index}
      source={{
        uri: suggestion.logoURI ?? undefined,
      }}
      title={"$" + suggestion.symbol}
      subtitle={chainName}
      className={theme?.suggestionsItemClassName}
      titleClassName={theme?.suggestionsItemSymbolClassName}
      subtitleClassName={theme?.suggestionsItemChainClassName}
      infoClassName={theme?.suggestionsItemInfoClassName}
      avatarClassName={theme?.suggestionsItemAvatarClassName}
      address={suggestion.address}
    />
  );
}

function ImageErrorIcon({
  avatarStyle,
}: {
  avatarStyle?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[
        {
          width: ICON_SIZE,
          height: ICON_SIZE,
          borderRadius: ICON_SIZE / 2,
          backgroundColor: "#f3f4f6",
          position: "relative",
          justifyContent: "center",
          alignItems: "center",
        },
        avatarStyle,
      ]}
    >
      <View
        style={{
          position: "absolute",
          width: 15,
          height: 2,
          borderRadius: 1,
          backgroundColor: "red",
          transform: [{ rotate: "45deg" }],
        }}
      />
      <View
        style={{
          position: "absolute",
          width: 15,
          height: 2,
          borderRadius: 1,
          backgroundColor: "red",
          transform: [{ rotate: "-45deg" }],
        }}
      />
    </View>
  );
}
