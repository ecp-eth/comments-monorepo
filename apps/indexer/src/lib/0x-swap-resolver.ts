import { IndexingFunctionArgs } from "ponder:registry";
import { env } from "../env";
import { base } from "viem/chains";
import { Chain, createPublicClient, http, PublicClient } from "viem";
import { parseSwap } from "@0x/0x-parser";
import { HexSchema, type Hex } from "@ecp.eth/sdk/core";
import { z } from "zod";

const ZeroExCommentMetadataSchema = z.preprocess(
  (data) => {
    try {
      if (typeof data !== "string") {
        return null;
      }

      return JSON.parse(data);
    } catch {
      return null;
    }
  },
  z.object({
    from: HexSchema,
    to: HexSchema,
    fromAmount: z.coerce.bigint().transform((value) => value.toString()),
    toAmount: z.coerce.bigint().transform((value) => value.toString()),
    swap: z.literal(true),
    provider: z.literal("0x"),
  }),
);

type ZeroExSwap = {
  from: {
    symbol: string;
    address: Hex;
    /**
     * Big int as string
     */
    amount: string;
  };
  to: {
    symbol: string;
    address: Hex;
    /**
     * Big int as string
     */
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

      const metadata = ZeroExCommentMetadataSchema.safeParse(
        event.args.metadata,
      );

      if (!metadata.success) {
        return null;
      }

      // @todo fix, this parses a float instead of bigint
      // so essentially it uses the value you entered
      const swap = await parseSwap({
        publicClient,
        transactionHash: event.transaction.hash,
      });

      if (!swap) {
        return null;
      }

      return {
        from: {
          symbol: swap.tokenOut.symbol,
          address: swap.tokenOut.address as Hex,
          amount: swap.tokenOut.amount,
        },
        to: {
          symbol: swap.tokenIn.symbol,
          address: swap.tokenIn.address as Hex,
          amount: swap.tokenIn.amount,
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
