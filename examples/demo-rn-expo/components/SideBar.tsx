import React from "react";
import { View } from "react-native";
import Link from "../ui/Link";
import { SideBarItem } from "./SideBarItem";
import { SafeAreaView } from "react-native-safe-area-context";

export function SideBar() {
  return (
    <View
      style={{
        display: "flex",
        flexGrow: 0,
        flexDirection: "column",
        gap: 10,
      }}
    >
      <SafeAreaView>
        <View
          style={{
            paddingTop: 20,
          }}
        >
          <SideBarItem>
            <Link href="https://docs.ethcomments.xyz">Documentation</Link>
          </SideBarItem>
          <SideBarItem>
            <Link href="https://github.com/ecp-eth/comments-monorepo/">
              Github
            </Link>
          </SideBarItem>
          <SideBarItem>
            <Link href="https://t.me/davidfurlong">Contact</Link>
          </SideBarItem>
        </View>
      </SafeAreaView>
    </View>
  );
}
