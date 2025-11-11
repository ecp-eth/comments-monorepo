import { anvil, base } from "@wagmi/core/chains";
import { publicEnv } from "./env";
import { http } from "wagmi";
import { WagmiAdapter } from "@reown/appkit-wagmi-react-native";

export const chain = publicEnv.EXPO_PUBLIC_CHAIN === "base" ? base : anvil;
export const projectId = publicEnv.EXPO_PUBLIC_REOWN_APP_ID;

export const transport = http(publicEnv.EXPO_PUBLIC_RPC_URL, {
  fetchOptions: {
    headers: {
      // the RPC URL used by api might has restricted origin
      Origin: publicEnv.EXPO_PUBLIC_SIGNER_API_URL,
    },
  },
});

export const wagmiAdapter = new WagmiAdapter({
  projectId,
  networks: [chain],
  transports: {
    [chain.id]: transport,
  },
});
export const config = wagmiAdapter.wagmiConfig;
