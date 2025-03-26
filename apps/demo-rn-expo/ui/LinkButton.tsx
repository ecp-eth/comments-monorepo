import { TouchableOpacity, Text } from "react-native";
import theme from "../theme";

export default function LinkButton({
  children,
  onPress,
}: {
  children: React.ReactNode;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress}>
      <Text
        style={{
          color: theme.colors.text.link,
          fontWeight: "bold",
        }}
      >
        {children}
      </Text>
    </TouchableOpacity>
  );
}
