import DataLoader from "dataloader";
import { getAddress, isAddressEqual, type Hex } from "viem";
import type {
  ResolvedERC20Data,
  ChainID,
  ERC20ClientRegistry,
  ERC20ClientConfig,
} from "./erc20.types";
import { tokenList } from "../token-list";

export type ERC20ByAddressResolverKey = [Hex, ChainID];

export type ERC20ByAddressResolver = DataLoader<
  ERC20ByAddressResolverKey,
  ResolvedERC20Data | null
>;

export type ERC20ByAddressResolverOptions = {
  clientRegistry: ERC20ClientRegistry;
} & DataLoader.Options<ERC20ByAddressResolverKey, ResolvedERC20Data | null>;

export function createERC20ByAddressResolver({
  clientRegistry,
  ...dataLoaderOptions
}: ERC20ByAddressResolverOptions): ERC20ByAddressResolver {
  return new DataLoader<ERC20ByAddressResolverKey, ResolvedERC20Data | null>(
    async (keys) => {
      return Promise.all(
        keys.map(([address, chainId]) =>
          resolveErc20Data(address, chainId, clientRegistry),
        ),
      );
    },
    dataLoaderOptions,
  );
}

async function resolveErc20Data(
  address: Hex,
  chainId: ChainID,
  clientRegistry: ERC20ClientRegistry,
): Promise<ResolvedERC20Data | null> {
  const config = await clientRegistry.getClientByChainId(chainId);

  if (!config) {
    console.warn(`No client found for chainId ${chainId}`);
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
      chainId: token.chainId,
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
  config: ERC20ClientConfig & { chainId: number },
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
      chainId: config.chainId,
      caip19: `eip155:${config.chainId}/erc20:${address}`,
    };
  } catch (e) {
    console.warn("Resolving ERC20 token from chain failed with", e);
    return null;
  }
}
