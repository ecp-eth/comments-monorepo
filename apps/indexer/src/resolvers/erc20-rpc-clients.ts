import { z } from "zod";
import { env } from "../env";
import { createPublicClient, type Hex, http, type PublicClient } from "viem";
import { getChainById } from "../utils/getChainById";

export type ChainClientConfig = {
  client: PublicClient;
  tokenAddressURL: (address: Hex) => string;
};

// create clients based on ERC20_RPC_URL_{chainId} env variables
export const erc20RpcClientsByChainId = Object.entries(env).reduce(
  (acc, [key, value]) => {
    if (key.startsWith("ERC20_RPC_URL_")) {
      const chainId = z.coerce
        .number()
        .int()
        .positive()
        .parse(key.replace("ERC20_RPC_URL_", ""));

      const rpcUrl = z.string().url().parse(value);
      const tokenUrl = z.string().url().parse(value);

      acc[chainId] = {
        client: createPublicClient({
          chain: getChainById(chainId),
          transport: http(rpcUrl),
        }),
        tokenAddressURL: (address) =>
          tokenUrl.replace("{tokenAddress}", address),
      };
    }

    return acc;
  },
  {} as Record<number, ChainClientConfig>,
);
