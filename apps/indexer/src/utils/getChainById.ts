import * as chains from "viem/chains";

const chainsById = Object.entries(chains).reduce(
  (acc, [, value]) => {
    acc[value.id] = value;

    return acc;
  },
  {} as Record<number, chains.Chain>,
);

export function getChainById(chainId: number): chains.Chain | undefined {
  return chainsById[chainId];
}
