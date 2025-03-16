import { PropsWithChildren } from "react";
import { View } from "react-native";

export default function SideBarItem({ children }: PropsWithChildren) {
  return (
    <View
      style={{
        paddingVertical: 10,
        paddingHorizontal: 20,
      }}
    >
      {children}
    </View>
  );
}
