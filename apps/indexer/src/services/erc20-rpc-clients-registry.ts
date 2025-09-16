import { z } from "zod";
import { createPublicClient, http } from "viem";
import { getChainById } from "../utils/getChainById.ts";
import {
  type ERC20ClientConfig,
  type ERC20ClientRegistry,
} from "../resolvers/index.ts";

class ERC20RpcClientsRegistry implements ERC20ClientRegistry {
  private clientsByChainId: Record<number, ERC20ClientConfig>;

  constructor() {
    const clientsByChainId = Object.entries(process.env).reduce(
      (acc, [key, value]) => {
        // create clients based on ERC20_RPC_URL_{chainId} and ERC20_TOKEN_URL_{chainId} env variables
        if (key.startsWith("ERC20_RPC_URL_")) {
          const chainId = z.coerce
            .number()
            .int()
            .positive()
            .parse(key.replace("ERC20_RPC_URL_", ""));

          const rpcUrl = z.string().url().parse(value);
          const tokenUrl = z
            .string()
            .url()
            .parse(process.env[`ERC20_TOKEN_URL_${chainId}`]);

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
      {} as Record<number, ERC20ClientConfig>,
    );

    this.clientsByChainId = clientsByChainId;
  }

  async getClientByChainId(chainId: number): Promise<ERC20ClientConfig | null> {
    return this.clientsByChainId[chainId] ?? null;
  }
}

export const erc20RpcClientsRegistryService = new ERC20RpcClientsRegistry();
