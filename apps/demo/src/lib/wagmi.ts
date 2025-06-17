import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "wagmi";
import * as allChains from "wagmi/chains";
import { publicEnv } from "@/publicEnv";
import { getChainById } from "@ecp.eth/shared/helpers";
import { SUPPORTED_CHAINS } from "@ecp.eth/sdk";

const anvil = allChains.anvil;

const prodChain = getChainById(
  publicEnv.NEXT_PUBLIC_PROD_CHAIN_ID,
  Object.values(allChains),
);

if (!prodChain) {
  throw new Error(`Chain ${publicEnv.NEXT_PUBLIC_PROD_CHAIN_ID} not supported`);
}

// swap works only with base, locally it doesn't work
export const chain = publicEnv.NODE_ENV === "development" ? anvil : prodChain;

if (!(chain.id in SUPPORTED_CHAINS)) {
  throw new Error(`Chain ${chain.id} not supported`);
}

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
