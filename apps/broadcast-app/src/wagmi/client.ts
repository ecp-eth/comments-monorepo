import { http, createConfig } from "wagmi";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { farcasterMiniApp as miniAppConnector } from "@farcaster/miniapp-wagmi-connector";
import { publicEnv } from "@/env/public";
import { chain } from "./shared";

export {
  chain,
  COMMENT_MANAGER_ADDRESS,
  CHANNEL_MANAGER_ADDRESS,
} from "./shared";

export const webConfig = getDefaultConfig({
  chains: [chain],
  transports: {
    [chain.id]: http(publicEnv.NEXT_PUBLIC_RPC_URL),
  },
  // do not use ssr for now because we are using account state to protect some routes
  // also there is nothing really worth pre-rendering on the server side
  // because layouts are client only
  appName: "ECP Broadcast App",
  projectId: publicEnv.NEXT_PUBLIC_WC_PROJECT_ID,
});

export const miniAppConfig = createConfig({
  chains: [chain], // this will work only for base chain
  transports: {
    [chain.id]: http(publicEnv.NEXT_PUBLIC_RPC_URL),
  },
  connectors: [miniAppConnector()],
});
