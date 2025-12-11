import { PropsWithChildren } from "react";
import { Linking, TouchableOpacity, Text } from "react-native";

export default function Link({
  children,
  ...restProps
}: PropsWithChildren<{ href: string } | { onPress: () => void }>) {
  return (
    <TouchableOpacity
      onPress={
        hasOnPress(restProps)
          ? restProps.onPress
          : () => Linking.openURL(restProps.href)
      }
    >
      <Text>{children}</Text>
    </TouchableOpacity>
  );
}

function hasOnPress(
  props: { href: string } | { onPress: () => void },
): props is { onPress: () => void } {
  return "onPress" in props && typeof props.onPress === "function";
}
