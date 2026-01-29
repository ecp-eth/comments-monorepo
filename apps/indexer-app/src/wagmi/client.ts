import { http } from "wagmi";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { publicEnv } from "@/env/public";
import { SUPPORTED_CHAINS } from "@ecp.eth/sdk";

export const chain = SUPPORTED_CHAINS[publicEnv.NEXT_PUBLIC_CHAIN_ID].chain;

export const webConfig = getDefaultConfig({
  chains: [chain],
  transports: {
    [publicEnv.NEXT_PUBLIC_CHAIN_ID]: http(publicEnv.NEXT_PUBLIC_RPC_URL),
  },
  // do not use ssr for now because we are using account state to protect some routes
  // also there is nothing really worth pre-rendering on the server side
  // because layouts are client only
  appName: "ECP Dashboard App",
  projectId: publicEnv.NEXT_PUBLIC_WC_PROJECT_ID,
});
