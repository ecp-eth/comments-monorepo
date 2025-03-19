import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "wagmi";
import { anvil, base } from "wagmi/chains";
import { publicEnv } from "@/publicEnv";

export const chain = base; // publicEnv.NODE_ENV === "development" ? anvil : base;

export const transport =
  chain.id === base.id
    ? http(publicEnv.NEXT_PUBLIC_RPC_URL)
    : http("http://localhost:8545");

export const getConfig = () =>
  getDefaultConfig({
    chains: [chain],
    transports: {
      [chain.id]: transport,
    },
    ssr: true,
    appName: "Comment App",
    projectId: publicEnv.NEXT_PUBLIC_WC_PROJECT_ID,
  });
