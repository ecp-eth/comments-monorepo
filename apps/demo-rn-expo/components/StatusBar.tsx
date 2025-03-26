import React from "react";
import { TouchableOpacity, View, Text } from "react-native";
import { useAccount } from "wagmi";
import { useAppKit } from "@reown/appkit-wagmi-react-native";
import { Hex, isHex } from "viem";
import { CurrentNetwork } from "../components/CurrentNetwork";
import { AuthorBox } from "./AuthorBox";

export function StatusBar() {
  const { address } = useAccount();
  const { open } = useAppKit();

  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      {address && isHex(address) ? <UserStatus address={address} /> : null}
      <TouchableOpacity
        onPress={() => {
          open({ view: "Networks" });
        }}
        style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
      >
        <Text>Connected to</Text>
        <CurrentNetwork />
      </TouchableOpacity>
    </View>
  );
}

const UserStatus = ({ address }: { address: Hex }) => {
  const { open } = useAppKit();

  return (
    <TouchableOpacity
      onPress={() =>
        open({
          view: "Account",
        })
      }
    >
      <AuthorBox author={{ address }} />
    </TouchableOpacity>
  );
};
