import React, { PropsWithChildren } from "react";
import {
  TouchableOpacity,
  View,
  ViewStyle,
  Text,
  FlatList,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import Animated, { AnimatedStyle } from "react-native-reanimated";
import theme from "../theme";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Comment } from "./Comment";
import { IndexerAPICommentSchemaType } from "@ecp.eth/sdk/indexer/schemas";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Hex } from "viem";
import { COMMENT_BOX_AVERAGE_HEIGHT } from "../lib/constants";
import { publicEnv } from "../env";
import { fetchCommentReplies } from "@ecp.eth/sdk/indexer";
import { ApplyFadeToScrollable } from "./ApplyFadeToScrollable";

type RepliesSectionProps = {
  rootComment: IndexerAPICommentSchemaType;
  onClose: () => void;
  onReply: (comment: IndexerAPICommentSchemaType) => void;
  onDelete: (comment: IndexerAPICommentSchemaType) => void;
  animatedStyle?: AnimatedStyle<ViewStyle>;
};

export function RepliesSectionParentCommentGuard({
  rootComment,
  animatedStyle,
  onClose,
  onReply,
  onDelete,
  ...props
}: Omit<RepliesSectionProps, "rootComment"> & {
  rootComment?: IndexerAPICommentSchemaType;
}) {
  if (!rootComment) {
    return (
      <ReplySectionContainer animatedStyle={animatedStyle} onClose={onClose}>
        <ReplySectionTextContainer>
          <Text>No comments yet</Text>
        </ReplySectionTextContainer>
      </ReplySectionContainer>
    );
  }

  return (
    <RepliesSection
      rootComment={rootComment}
      animatedStyle={animatedStyle}
      onClose={onClose}
      onReply={onReply}
      onDelete={onDelete}
      {...props}
    />
  );
}

function RepliesSection({
  rootComment,
  onClose,
  onReply,
  animatedStyle,
  onDelete,
}: RepliesSectionProps) {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ["replies", rootComment.id],
      initialPageParam: {
        cursor: undefined as Hex | undefined,
        // assuming comment box minimal height is 120, we want to at least fetch enough
        // to fill the screen
        // cursor: pageParam,
        limit: Math.ceil(
          Dimensions.get("window").height / COMMENT_BOX_AVERAGE_HEIGHT
        ),
      },
      queryFn: ({ pageParam, signal }) => {
        return fetchCommentReplies({
          mode: "flat",
          apiUrl: publicEnv.EXPO_PUBLIC_INDEXER_URL,
          app: publicEnv.EXPO_PUBLIC_APP_SIGNER_ADDRESS,
          commentId: rootComment.id,

          limit: pageParam.limit,
          cursor: pageParam.cursor,
          signal,
        });
      },
      getNextPageParam: (lastPage) => {
        if (!lastPage.pagination.hasNext) {
          return;
        }

        return {
          cursor: lastPage.pagination.endCursor,
          limit: lastPage.pagination.limit,
        };
      },
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      enabled: true,
    });

  const replies =
    data?.pages
      .flatMap((page) => page.results)
      .filter((comment) => {
        return comment.deletedAt == null;
      }) ?? [];

  if (isLoading) {
    return (
      <ReplySectionContainer animatedStyle={animatedStyle} onClose={onClose}>
        <ReplySectionTextContainer>
          <ActivityIndicator />
        </ReplySectionTextContainer>
      </ReplySectionContainer>
    );
  }

  if (replies.length <= 0) {
    return (
      <ReplySectionContainer animatedStyle={animatedStyle} onClose={onClose}>
        <ReplySectionTextContainer>
          <Text>No comments yet</Text>
        </ReplySectionTextContainer>
      </ReplySectionContainer>
    );
  }

  return (
    <ReplySectionContainer animatedStyle={animatedStyle} onClose={onClose}>
      <ApplyFadeToScrollable>
        <FlatList
          keyboardShouldPersistTaps="handled"
          data={replies}
          renderItem={({ item }) => (
            <Comment comment={item} onDelete={onDelete} onReply={onReply} />
          )}
          keyExtractor={(item) => item.id}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) {
              fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.5}
          ListFooterComponent={() =>
            isFetchingNextPage ? <ActivityIndicator /> : null
          }
        />
      </ApplyFadeToScrollable>
    </ReplySectionContainer>
  );
}

function ReplySectionContainer({
  children,
  animatedStyle,
  onClose,
}: PropsWithChildren<{
  animatedStyle?: AnimatedStyle<ViewStyle>;
  onClose: () => void;
}>) {
  return (
    <Animated.View
      style={[
        {
          flex: 1,
          flexDirection: "column",
          position: "absolute",
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
          width: "100%",
          backgroundColor: theme.colors.background.default,
          zIndex: 1,
        },
        animatedStyle,
      ]}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "flex-start",
          alignItems: "center",
          paddingBottom: 10,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.hr,
          borderStyle: "solid",
          marginTop: 10,
        }}
      >
        <TouchableOpacity onPress={onClose} hitSlop={50}>
          <View
            style={{
              display: "flex",
              flexGrow: 0,
              flexShrink: 0,
              justifyContent: "center",
              alignItems: "center",
              width: 40,
              height: 40,
              // backgroundColor: "red",
            }}
          >
            <Ionicons name="chevron-back" size={24} color="black" />
          </View>
        </TouchableOpacity>
        <Text
          style={{
            fontWeight: "bold",
            fontSize: 18,
            textAlign: "center",
            flexGrow: 1,
          }}
        >
          Replies
        </Text>
      </View>
      <View style={{ flex: 1 }}>{children}</View>
    </Animated.View>
  );
}

function ReplySectionTextContainer({ children }: PropsWithChildren) {
  return (
    <View
      style={{
        marginVertical: 20,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {children}
    </View>
  );
}
