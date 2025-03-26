import React from "react";
import { View } from "react-native";
import Providers from "./Providers";
import { SideBarLayout } from "./components/SideBarLayout";
import Home from "./screens/Home";
import theme from "./theme";

export default function App() {
  return (
    <Providers>
      <View
        style={{
          flex: 1,
          backgroundColor: theme.colors.background.sideBar,
        }}
      >
        <SideBarLayout>
          <Home />
        </SideBarLayout>
      </View>
    </Providers>
  );
}
