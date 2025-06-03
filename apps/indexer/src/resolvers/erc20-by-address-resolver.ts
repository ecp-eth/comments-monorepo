import DataLoader from "dataloader";
import { getAddress, isAddressEqual, type Hex } from "viem";
import type { ResolvedERC20Data } from "./types";
import { LRUCache } from "lru-cache";
import { tokenList } from "@ecp.eth/shared/token-list";
import {
  type ChainClientConfig,
  erc20RpcClientsByChainId,
} from "./erc20-rpc-clients";

type ChainID = number;

type DataLoaderKey = [Hex, ChainID];

export type ERC20ByAddressResolver = DataLoader<
  DataLoaderKey,
  ResolvedERC20Data | null
>;

async function resolveErc20Data(
  address: Hex,
  chainId: ChainID,
): Promise<ResolvedERC20Data | null> {
  const config = erc20RpcClientsByChainId[chainId];

  if (!config) {
    return null;
  }

  const token = tokenList.find(
    (token) =>
      isAddressEqual(token.address as Hex, address) &&
      token.chainId === chainId,
  );

  if (token) {
    return {
      address: token.address as Hex,
      decimals: token.decimals,
      logoURI: token.logoURI,
      name: token.name,
      symbol: token.symbol,
      caip19: token.caip19,
      url: config.tokenAddressURL(address),
    };
  }

  const code = await config.client.getCode({
    address,
  });

  if (code !== "0x") {
    return null;
  }

  return resolveERC20Token(address, {
    ...config,
    chainId,
  });
}

function createERC20ByAddressResolver(): ERC20ByAddressResolver {
  // could also use redis
  const cacheMap = new LRUCache<
    DataLoaderKey,
    Promise<ResolvedERC20Data | null>
  >({
    max: 10000,
    ttl: 14 * 24 * 60 * 60 * 1000, // 14 days
    allowStale: true,
  });

  return new DataLoader<DataLoaderKey, ResolvedERC20Data | null>(
    async (keys) => {
      return Promise.all(
        keys.map(([address, chainId]) => resolveErc20Data(address, chainId)),
      );
    },
    {
      cacheMap,
    },
  );
}

export const erc20ByAddressResolver = createERC20ByAddressResolver();

const ERC20_ABI = [
  {
    name: "name",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "string" }],
  },
  {
    name: "symbol",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "string" }],
  },
  {
    name: "decimals",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint8" }],
  },
  {
    name: "logoURI",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "string" }],
  },
] as const;

async function resolveERC20Token(
  address: Hex,
  config: ChainClientConfig & { chainId: number },
): Promise<null | ResolvedERC20Data> {
  const bytecode = await config.client.getCode({ address });

  if (!bytecode) {
    return null;
  }

  try {
    const name = await config.client.readContract({
      address,
      abi: ERC20_ABI,
      functionName: "name",
    });

    const symbol = await config.client.readContract({
      address,
      abi: ERC20_ABI,
      functionName: "symbol",
    });

    const decimals = await config.client.readContract({
      address,
      abi: ERC20_ABI,
      functionName: "decimals",
    });

    return {
      address: getAddress(address),
      name,
      symbol,
      decimals,
      logoURI: null,
      url: config.tokenAddressURL(address),
      caip19: `eip155:${config.chainId}/erc20:${address}`,
    };
  } catch (e) {
    console.warn("Resolving ERC20 token from chain failed with", e);
    return null;
  }
}
