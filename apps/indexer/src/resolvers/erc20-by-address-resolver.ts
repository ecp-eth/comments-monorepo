import {
  createERC20ByAddressResolver,
  type ERC20ByAddressResolver,
  type ERC20ByAddressResolverKey,
} from "@ecp.eth/shared/resolvers";
import type { ResolvedERC20Data } from "./types";
import { LRUCache } from "lru-cache";
import { erc20RpcClientsRegistry } from "./erc20-rpc-clients-registry";

export type { ERC20ByAddressResolver };

// could also use redis
const cacheMap = new LRUCache<
  ERC20ByAddressResolverKey,
  Promise<ResolvedERC20Data | null>
>({
  max: 10000,
  ttl: 14 * 24 * 60 * 60 * 1000, // 14 days
  allowStale: true,
});
export const erc20ByAddressResolver = createERC20ByAddressResolver({
  clientRegistry: erc20RpcClientsRegistry,
  cacheMap,
});
