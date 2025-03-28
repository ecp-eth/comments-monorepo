import React from "react";
import { View } from "react-native";
import { chain } from "../wagmi.config";
import { Base } from "./icons/chains/Base";
import { Anvil } from "./icons/chains/Anvil";

export function CurrentNetwork() {
  return (
    <View>
      {chain.name === "Base" ? (
        <Base fill="#fff" width={24} height={24} />
      ) : (
        <Anvil width={24} height={24} />
      )}
    </View>
  );
}
