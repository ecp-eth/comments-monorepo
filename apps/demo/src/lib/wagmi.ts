import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "wagmi";
import * as allChains from "wagmi/chains";
import { publicEnv } from "@/publicEnv";
import { getChainById } from "@ecp.eth/shared/helpers";

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

/**
 * Chains that are used to resolve address when typing a comment
 */
export const supportedChains = {
  [prodChain.id]: {
    chain: prodChain,
    transport: http(publicEnv.NEXT_PUBLIC_RPC_URL),
  },
  [anvil.id]: {
    chain: anvil,
    transport: http("http://localhost:8545"),
  },
};

export const transport = supportedChains[chain.id].transport;

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
