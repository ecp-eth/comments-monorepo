import { IndexingFunctionArgs } from "ponder:registry";
import { env } from "../env";
import { base } from "viem/chains";
import { Chain, createPublicClient, http, PublicClient } from "viem";
import { parseSwap } from "@0x/0x-parser";
import { type Hex } from "@ecp.eth/sdk/core";

type ZeroExSwap = {
  from: {
    symbol: string;
    address: Hex;
    amount: string;
  };
  to: {
    symbol: string;
    address: Hex;
    amount: string;
  };
};

interface ZeroExSwapResolver {
  resolveFromCommentAddedEvent(
    args: IndexingFunctionArgs<"CommentsV1:CommentAdded">,
  ): Promise<ZeroExSwap | null>;
}

type CreateZeroExSwapResolverOptions = {
  chains: Record<
    number,
    {
      chain: Chain;
      rpcURL: string;
    }
  >;
};

export function createZeroExSwapResolver(
  options: CreateZeroExSwapResolverOptions,
): ZeroExSwapResolver {
  const hasWarned: Record<number, boolean> = {};
  const clients: Record<
    number,
    PublicClient<ReturnType<typeof http>, Chain>
  > = Object.values(options.chains).reduce(
    (acc, chain) => {
      acc[chain.chain.id] = createPublicClient({
        chain: chain.chain,
        transport: http(chain.rpcURL),
      });
      return acc;
    },
    {} as Record<number, PublicClient<ReturnType<typeof http>, Chain>>,
  );

  return {
    resolveFromCommentAddedEvent: async ({ event, context }) => {
      if (!options.chains[context.network.chainId]) {
        if (!hasWarned[context.network.chainId]) {
          hasWarned[context.network.chainId] = true;
          console.warn(
            `ZeroExSwapResolver: Chain ${context.network.chainId} is not supported, skipping...`,
          );
        }

        return null;
      }

      const publicClient = clients[context.network.chainId];

      if (!publicClient) {
        throw new Error(
          `ZeroExSwapResolver: Public client for chain ${context.network.chainId} not found`,
        );
      }

      // Try to parse swap directly from transaction hash
      // Note: metadata is not available in CommentAdded event, it comes from separate CommentMetadataSet events
      const swap = await parseSwap({
        publicClient,
        transactionHash: event.transaction.hash,
      });

      if (!swap) {
        return null;
      }

      return {
        from: {
          symbol: swap.tokenIn.symbol,
          address: swap.tokenIn.address as Hex,
          amount: swap.tokenIn.amount,
        },
        to: {
          symbol: swap.tokenOut.symbol,
          address: swap.tokenOut.address as Hex,
          amount: swap.tokenOut.amount,
        },
      };
    },
  };
}

export const zeroExSwapResolver = createZeroExSwapResolver({
  chains: env.PONDER_RPC_URL_8453
    ? {
        [base.id]: {
          chain: base,
          rpcURL: env.PONDER_RPC_URL_8453,
        },
      }
    : {},
});
