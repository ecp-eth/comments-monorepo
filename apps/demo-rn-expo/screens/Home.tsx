import React, { useState } from "react";
import { View } from "react-native";
import { IndexerAPICommentSchemaType } from "@ecp.eth/sdk/indexer/schemas";
import { CommentSection } from "../components/CommentSection";
import { StatusBar } from "../components/StatusBar";
import { CommentForm } from "../components/CommentForm";

export default function Home() {
  const [justViewingReplies, setJustViewingReplies] = useState(false);
  const [replyingComment, setReplyingComment] =
    useState<IndexerAPICommentSchemaType>();

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
            replyingComment={replyingComment}
            justViewingReplies={justViewingReplies}
            onCancelReply={() => setReplyingComment(undefined)}
          />
        </View>
      </View>
      <CommentSection
        replyingComment={replyingComment}
        onReply={(replyingComment) => {
          setJustViewingReplies(false);
          setReplyingComment(replyingComment);
        }}
        onViewReplies={(replyingComment) => {
          setJustViewingReplies(true);
          setReplyingComment(replyingComment);
        }}
        onCloseViewReplies={() => {
          setJustViewingReplies(false);
          setReplyingComment(undefined);
        }}
      />
    </View>
  );
}
