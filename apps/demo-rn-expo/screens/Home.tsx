import React, { useState } from "react";
import { View } from "react-native";
import { IndexerAPICommentSchemaType } from "@ecp.eth/sdk/schemas";
import { CommentSection } from "../components/CommentSection";
import { StatusBar } from "../components/StatusBar";
import { CommentForm } from "../components/CommentForm";
import { isZeroHex } from "@ecp.eth/sdk";

export default function Home() {
  const [justViewingReplies, setJustViewingReplies] = useState(false);
  const [replyingComment, setReplyingComment] =
    useState<IndexerAPICommentSchemaType>();
  const [rootComment, setRootComment] = useState<IndexerAPICommentSchemaType>();
  const handleSetCommentState = (
    replyingComment: IndexerAPICommentSchemaType
  ) => {
    setReplyingComment(replyingComment);
    if (!replyingComment.parentId || isZeroHex(replyingComment.parentId)) {
      setRootComment(replyingComment);
    }
  };

  return (
    <View
      style={{
        flex: 1,
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
    </View>
  );
}
