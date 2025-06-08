import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "wagmi";
import { anvil, monadTestnet } from "wagmi/chains";
import { publicEnv } from "@/publicEnv";

const prodChain = monadTestnet;

// swap works only with base, locally it doesn't work
export const chain = publicEnv.NODE_ENV === "development" ? anvil : prodChain;

export const transport =
  chain.id === prodChain.id
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
