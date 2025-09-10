import React, { useCallback, useEffect, useState } from "react";
import { fetchComments } from "@ecp.eth/sdk/indexer";
import { useInfiniteQuery } from "@tanstack/react-query";
import {
  View,
  Text,
  ActivityIndicator,
  FlatList,
  Dimensions,
  ScrollView,
} from "react-native";
import {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Hex } from "viem";
import { IndexerAPICommentSchemaType } from "@ecp.eth/sdk/indexer/schemas";
import { publicEnv } from "../env";
import { Comment } from "./Comment";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RepliesSectionParentCommentGuard as RepliesSection } from "./RepliesSection";
import { ApplyFadeToScrollable } from "./ApplyFadeToScrollable";
import { COMMENT_BOX_AVERAGE_HEIGHT } from "../lib/constants";
import { useOptimisticCommentingManager } from "../hooks/useOptimisticCommentingManager";
import { useDeleteComment } from "../hooks/useDeleteComment";
import { chain } from "../wagmi.config";
import { COMMENT_TYPE_COMMENT } from "@ecp.eth/sdk";
import LinkButton from "../ui/LinkButton";

type CommentSectionProps = {
  onReply: (comment: IndexerAPICommentSchemaType) => void;
  onViewReplies: (comment: IndexerAPICommentSchemaType) => void;
  onCloseViewReplies: () => void;
  replyingComment?: IndexerAPICommentSchemaType;
  rootComment?: IndexerAPICommentSchemaType;
};

export function CommentSection({
  onReply,
  onViewReplies,
  onCloseViewReplies,
  replyingComment,
  rootComment,
}: CommentSectionProps) {
  const insets = useSafeAreaInsets();
  const { repliesSectionAnimatedStyle, handleCloseReplies, handleViewReplies } =
    useRepliesAnimation(onViewReplies, onCloseViewReplies, replyingComment);

  const {
    data,
    isPending,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    error,
    refetch,
  } = useInfiniteQuery({
    queryKey: ["comments"],
    initialPageParam: {
      cursor: undefined as Hex | undefined,
      // assuming comment box minimal height is 120, we want to at least fetch enough
      // to fill the screen
      // cursor: pageParam,
      limit: Math.ceil(
        Dimensions.get("window").height / COMMENT_BOX_AVERAGE_HEIGHT,
      ),
    },
    queryFn: ({ pageParam, signal }) => {
      return fetchComments({
        apiUrl: publicEnv.EXPO_PUBLIC_INDEXER_URL,
        targetUri: publicEnv.EXPO_PUBLIC_TARGET_URI,
        app: publicEnv.EXPO_PUBLIC_APP_SIGNER_ADDRESS,
        chainId: chain.id,
        limit: pageParam.limit,
        cursor: pageParam.cursor,
        signal,
        commentType: COMMENT_TYPE_COMMENT,
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

  const deletePendingOperations = useDeletePendingOperations(rootComment);
  const { mutateAsync: deleteComment } = useDeleteComment();
  const [showErrorDetails, setShowErrorDetails] = useState(false);

  if (error) {
    return (
      <CommentSectionContainer>
        <View
          style={{
            flex: 1,
            flexDirection: "column",
            justifyContent: "flex-start",
            alignItems: "center",
          }}
        >
          <Text>😶‍🌫️ Error fetching comments</Text>
          <View style={{ marginVertical: 20, gap: 10, alignItems: "center" }}>
            <LinkButton
              onPress={() => {
                refetch();
              }}
            >
              Retry
            </LinkButton>
            <LinkButton
              onPress={() => {
                setShowErrorDetails(!showErrorDetails);
              }}
            >
              {showErrorDetails ? "Hide error" : "Show error"}
            </LinkButton>
          </View>

          {showErrorDetails && (
            <ScrollView>
              <Text>{error.message}</Text>
            </ScrollView>
          )}
        </View>
      </CommentSectionContainer>
    );
  }

  if (isPending) {
    return (
      <CommentSectionContainer>
        <ActivityIndicator />
      </CommentSectionContainer>
    );
  }

  const allComments =
    data?.pages
      .flatMap((page) => page.results)
      .filter((comment) => {
        return comment.deletedAt == null;
      }) ?? [];

  if (allComments.length <= 0) {
    return (
      <CommentSectionContainer>
        <Text>No comments yet</Text>
      </CommentSectionContainer>
    );
  }

  return (
    <CommentSectionContainer disablePaddingVertical={true}>
      <ApplyFadeToScrollable
        style={{
          flex: 1,
        }}
      >
        <FlatList
          keyboardShouldPersistTaps="handled"
          data={allComments}
          renderItem={({ item }) => (
            <Comment
              comment={item}
              onReply={onReply}
              onViewReplies={handleViewReplies}
              onDelete={async (comment) => {
                await deleteComment(comment.id);
                deletePendingOperations(comment.id);
              }}
            />
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
          contentContainerStyle={{
            paddingTop: 30,
            paddingBottom: insets.bottom,
          }}
        />
      </ApplyFadeToScrollable>
      <RepliesSection
        rootComment={rootComment}
        animatedStyle={repliesSectionAnimatedStyle}
        onClose={handleCloseReplies}
        onReply={onReply}
        onDelete={async (comment) => {
          await deleteComment(comment.id);
          deletePendingOperations(comment.id);
        }}
      />
    </CommentSectionContainer>
  );
}

const useDeletePendingOperations = (
  rootComment?: IndexerAPICommentSchemaType,
) => {
  const isReplying = !!rootComment;
  const { deletePendingCommentOperation } = useOptimisticCommentingManager([
    "comments",
  ]);
  const { deletePendingCommentOperation: deletePendingReplyOperation } =
    useOptimisticCommentingManager(["replies", rootComment?.id]);
  return useCallback(
    (commentId: Hex) => {
      deletePendingCommentOperation(commentId);
      if (isReplying) {
        deletePendingReplyOperation(commentId);
      }
    },
    [deletePendingCommentOperation, deletePendingReplyOperation, isReplying],
  );
};

const useRepliesAnimation = (
  onViewReplies: (comment: IndexerAPICommentSchemaType) => void,
  onCloseViewReplies: () => void,
  replyingComment: IndexerAPICommentSchemaType | undefined,
) => {
  const repliesLeft = useSharedValue<`${number}%`>("100%");
  const repliesSectionAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: repliesLeft.value }],
    };
  });
  const handleViewReplies = (comment: IndexerAPICommentSchemaType) => {
    onViewReplies(comment);
  };
  const handleCloseReplies = () => {
    onCloseViewReplies();
  };

  useEffect(() => {
    if (replyingComment) {
      repliesLeft.value = withTiming("0%", {
        duration: 200,
      });
      return;
    }

    repliesLeft.value = withTiming("100%", {
      duration: 200,
    });
  }, [repliesLeft, replyingComment]);

  return {
    repliesSectionAnimatedStyle,
    handleViewReplies,
    handleCloseReplies,
  };
};

export const CommentSectionContainer = ({
  children,
  disablePaddingVertical = false,
}: {
  children: React.ReactNode;
  disablePaddingVertical?: boolean;
}) => {
  return (
    <View
      style={{
        flex: 1,
        paddingTop: disablePaddingVertical ? 0 : 30,
        paddingHorizontal: 30,
      }}
    >
      <View style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        {children}
      </View>
    </View>
  );
};
