import React, { useState } from "react";
import { View, Image } from "react-native";
import { getCommentAuthorNameOrAddress } from "@ecp.eth/shared/helpers";
import { useEnrichedAuthor } from "../hooks/useEnrichedAuthor";
import identicon from "../lib/identicon";
import { AuthorType } from "@ecp.eth/shared/types";

const AVATAR_SIZE = 24;

type AuthorAvatarProps = {
  author: AuthorType;
};

export function AuthorAvatar({ author }: AuthorAvatarProps) {
  const [isAvatarLoaded, setIsAvatarLoaded] = useState(false);
  const enrichedAuthor = useEnrichedAuthor(author);
  const nameOrAddress = getCommentAuthorNameOrAddress(enrichedAuthor);
  const fallbackAvatarUrl = identicon(author.address, AVATAR_SIZE);
  const avatarUrl =
    enrichedAuthor.ens?.avatarUrl ??
    enrichedAuthor.farcaster?.pfpUrl ??
    fallbackAvatarUrl;

  return (
    <View
      style={{
        width: AVATAR_SIZE,
        height: AVATAR_SIZE,
        borderRadius: AVATAR_SIZE / 2,
        overflow: "hidden",
        backgroundColor: "#EFEFEF",
        position: "relative",
      }}
    >
      <Image
        source={{ uri: fallbackAvatarUrl }}
        style={{
          width: AVATAR_SIZE,
          height: AVATAR_SIZE,
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: isAvatarLoaded ? 1 : 2,
        }}
        resizeMode="cover"
      />
      <Image
        onLoad={() => setIsAvatarLoaded(true)}
        source={{ uri: avatarUrl }}
        style={{
          width: AVATAR_SIZE,
          height: AVATAR_SIZE,
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: isAvatarLoaded ? 2 : 1,
        }}
        resizeMode="cover"
        alt={nameOrAddress}
      />
    </View>
  );
}
