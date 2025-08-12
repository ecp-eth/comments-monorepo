import React, { PropsWithChildren, useMemo } from "react";
import { TouchableOpacity, Linking } from "react-native";
import { formatAuthorLink } from "../lib/utils";
import { AuthorType } from "@ecp.eth/shared/types";

export function AuthorLinker({
  children,
  author,
}: PropsWithChildren<{
  author: AuthorType;
}>) {
  const authorLink = useMemo(() => formatAuthorLink(author), [author]);

  if (!authorLink) {
    return <>{children}</>;
  }

  return (
    <TouchableOpacity
      onPress={() => Linking.openURL(authorLink)}
      style={{
        flexShrink: 1,
      }}
    >
      {children}
    </TouchableOpacity>
  );
}
