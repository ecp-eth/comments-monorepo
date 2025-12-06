import React, { useState } from "react";
import { KeyboardAvoidingView, View } from "react-native";
import { IndexerAPICommentSchemaType } from "@ecp.eth/sdk/indexer/schemas";
import { CommentSection } from "../components/CommentSection";
import { StatusBar } from "../components/StatusBar";
import { CommentForm } from "../components/CommentForm";
import { isZeroHex } from "@ecp.eth/sdk/core";
import { useLayoutConfigContext } from "../components/LayoutConfigProvider";

export default function Home() {
  const layoutConfig = useLayoutConfigContext();
  const [justViewingReplies, setJustViewingReplies] = useState(false);
  const [replyingComment, setReplyingComment] =
    useState<IndexerAPICommentSchemaType>();
  const [rootComment, setRootComment] = useState<IndexerAPICommentSchemaType>();
  const handleSetCommentState = (
    replyingComment: IndexerAPICommentSchemaType,
  ) => {
    setReplyingComment(replyingComment);
    if (!replyingComment.parentId || isZeroHex(replyingComment.parentId)) {
      setRootComment(replyingComment);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior="padding"
      style={{
        flex: 1,
        flexDirection:
          layoutConfig.commentForm === "on-top" ? "column" : "column-reverse",
      }}
    >
      <View
        style={{
          paddingTop: 30,
        }}
      >
        <View
          style={{
            position: "relative",
            paddingHorizontal: 30,
            gap: 20,
          }}
        >
          <StatusBar />
          <CommentForm
            rootComment={rootComment}
            replyingComment={replyingComment}
            justViewingReplies={justViewingReplies}
            onCancelReply={() => setReplyingComment(undefined)}
          />
        </View>
      </View>
      <CommentSection
        rootComment={rootComment}
        replyingComment={replyingComment}
        onReply={(replyingComment) => {
          setJustViewingReplies(false);
          handleSetCommentState(replyingComment);
        }}
        onViewReplies={(replyingComment) => {
          setJustViewingReplies(true);
          handleSetCommentState(replyingComment);
        }}
        onCloseViewReplies={() => {
          setJustViewingReplies(false);
          setReplyingComment(undefined);
          setRootComment(undefined);
        }}
      />
    </KeyboardAvoidingView>
  );
}
