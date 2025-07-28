import { http, createConfig } from "wagmi";
import { base } from "wagmi/chains";
import { farcasterMiniApp as miniAppConnector } from "@farcaster/miniapp-wagmi-connector";
import { publicEnv } from "@/env/public";

export const chain = base;

export const config = createConfig({
  chains: [chain],
  transports: {
    [chain.id]: http(publicEnv.NEXT_PUBLIC_RPC_URL),
  },
  connectors: [miniAppConnector()],
});
