import { View, Text } from "react-native";
import Link from "../ui/Link";

export default function Header() {
  return (
    <View
      style={{
        display: "flex",
        flexGrow: 0,
        flexDirection: "row",
        gap: 10,
        paddingVertical: 20,
        justifyContent: "center",
        borderBottomWidth: 1,
        borderBottomColor: "rgba(0, 0, 0, 0.1)",
      }}
    >
      <Text
        style={{
          fontWeight: "bold",
        }}
      >
        Ethereum Comments Protocol Demo
      </Text>
    </View>
  );
}
