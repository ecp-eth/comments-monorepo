import React from "react";
import { PropsWithChildren } from "react";
import { View } from "react-native";

export function SideBarItem({ children }: PropsWithChildren) {
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
