import React from "react";
import { getCommentAuthorNameOrAddress } from "@ecp.eth/shared/helpers";
import { View, Text } from "react-native";
import { AuthorAvatar } from "./AuthorAvatar";
import { useEnrichedAuthor } from "../hooks/useEnrichedAuthor";
import { AuthorType } from "@ecp.eth/shared/types";

type AuthorBoxProps = {
  author: AuthorType;
};

export function AuthorBox({ author }: AuthorBoxProps) {
  const enrichedAuthor = useEnrichedAuthor(author);
  const nameOrAddress = getCommentAuthorNameOrAddress(enrichedAuthor);

  return (
    <View
      style={{
        flexDirection: "row",
        flexShrink: 1,
        alignItems: "center",
        gap: 10,
      }}
    >
      <AuthorAvatar author={enrichedAuthor} />
      <View style={{ flexShrink: 1 }}>
        <Text ellipsizeMode="tail" numberOfLines={1}>
          {nameOrAddress}
        </Text>
      </View>
    </View>
  );
}
