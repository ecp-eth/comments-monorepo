import { PropsWithChildren } from "react";
import { Linking, TouchableOpacity, Text } from "react-native";

export default function Link({
  href,
  children,
}: PropsWithChildren<{ href: string }>) {
  return (
    <TouchableOpacity onPress={() => Linking.openURL(href)}>
      <Text>{children}</Text>
    </TouchableOpacity>
  );
}
