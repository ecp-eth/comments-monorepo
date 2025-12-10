import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Image,
  ImageSourcePropType,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";
import type { Hex } from "viem";
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

// TODO: should we configure native wind for all sizes?
const ICON_SIZE = 24;
const FONT_SIZE = 12;
const GAP = 8;
const PADDING_VERTICAL = 12;
const PADDING_HORIZONTAL = 20;
const GAP_DROPDOWN_FROM_INPUT_BOTTOM = 8;

export type SuggestionsProps = INativeExposedComSuggestionProps & {
  command: (item: MentionItem) => void;
  enabled: boolean;
  onDismiss: () => void;
};

export function Suggestions({
  items,
  query,
  clientRect,
  command,
  enabled,
  onDismiss,
}: SuggestionsProps) {
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

  const enableContent =
    isValidQuery(query, MINIMUM_QUERY_LENGTH) && items.length > 0 && enabled;

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
                  handle={item.type === "farcaster" ? item.fname : item.name}
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
      enabled={enableContent}
      inputRect={clientRect}
      gap={GAP_DROPDOWN_FROM_INPUT_BOTTOM}
      onDismiss={onDismiss}
    >
      {({ popAbove, maxHeight }) => {
        console.log("render flatlist", enableContent, items.length, maxHeight);
        return enableContent ? (
          <View
            style={{
              flex: 1,

              borderBottomWidth: 1,
              borderTopWidth: 1,
              borderColor: "#EFEFEF",

              backgroundColor: "#FFF",
            }}
          >
            {items.length <= 0 ? null : (
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
                inverted={popAbove}
              />
            )}
          </View>
        ) : null;
      }}
    </KeyboardAvoidPopUpView>
  );
}

const ANIMATION_DURATION = 300;
const ANIMATION_DELAY_PER_ITEM = 50;
const SLIDE_DISTANCE = 0; // disabled for now according to discussion

function SuggestionItem({
  source,
  title,
  subtitle,
  index,
}: {
  source: ImageSourcePropType;
  title: React.ReactNode;
  subtitle: React.ReactNode;
  index: number;
}) {
  const { left, right } = useSafeAreaInsets();
  const opacity = useSharedValue(0);
  const translateX = useSharedValue(SLIDE_DISTANCE);
  const [hasAnimated, setHasAnimated] = useState(false);

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
      ]}
    >
      <Image
        source={source}
        style={{
          width: ICON_SIZE,
          height: ICON_SIZE,
          borderRadius: ICON_SIZE / 2,
          backgroundColor: "#f3f4f6",
        }}
      />
      <View
        style={{
          flex: 1,
          minWidth: 0,
        }}
      >
        <Text
          style={{
            fontSize: FONT_SIZE,
            fontWeight: "500",
          }}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {title}
        </Text>
        <Text
          style={{ fontSize: FONT_SIZE, color: "#6b7280" }}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {subtitle}
        </Text>
      </View>
    </Animated.View>
  );
}

type AccountSuggestionProps = {
  index: number;
  address: Hex;
  avatarUrl: string | null | undefined;
  name: string;
  handle: string;
};

function AccountSuggestion({
  index,
  address,
  avatarUrl,
  name,
  handle,
}: AccountSuggestionProps) {
  return (
    <SuggestionItem
      index={index}
      source={{ uri: avatarUrl ?? blo(address, 24) }}
      title={name}
      subtitle={handle}
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
  const chainName = getChainById(
    suggestion.chainId,
    Object.values(chains),
  )?.name;

  return (
    <SuggestionItem
      index={index}
      source={{ uri: suggestion.logoURI ?? blo(suggestion.address, 24) }}
      title={"$" + suggestion.symbol}
      subtitle={chainName}
    />
  );
}
