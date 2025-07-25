import { publicEnv } from "@/publicEnv";
import {
  getChainById,
  getNetworkFromProcessEnv,
} from "@ecp.eth/shared/helpers";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { Transport } from "wagmi";
import * as allChains from "wagmi/chains";
import { SUPPORTED_CHAINS } from "@ecp.eth/sdk";

const networks = getNetworkFromProcessEnv("NEXT_PUBLIC_", publicEnv);

export const supportedChains = Object.values(networks)
  .map((network) => {
    const chain = getChainById(network.chainId, Object.values(allChains));

    if (!chain || !(chain.id in SUPPORTED_CHAINS)) {
      return null;
    }

    return chain;
  })
  .filter((chain) => chain != null);

if (supportedChains.length === 0) {
  throw new Error("No supported chains found");
}

export const transports = Object.entries(networks).reduce(
  (acc, [chainId, network]) => {
    acc[Number(chainId)] = network.transport;
    return acc;
  },
  {} as Record<number, Transport>,
);

export const getWagmiConfig = (selectedChainId: number) => {
  const selectedChain = getChainById(selectedChainId, supportedChains);

  if (!selectedChain) {
    throw new Error(
      `Chain ${selectedChainId} not supported, here is a list of supported chains: ${supportedChains.reduce((acc, chain) => `${acc}, ${chain.name}`, "")}`,
    );
  }

  return getDefaultConfig({
    chains: [selectedChain],
    transports,
    ssr: true,
    appName: "Comment App",
    projectId: publicEnv.NEXT_PUBLIC_WC_PROJECT_ID,
  });
};
