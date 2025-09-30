import * as Sentry from "@sentry/node";
import type { IndexingFunctionArgs } from "ponder:registry";
import { env } from "../env.ts";
import { base } from "viem/chains";
import { type Chain, createPublicClient, http, type PublicClient } from "viem";
import { parseSwap } from "@0x/0x-parser";
import { HexSchema, type Hex } from "@ecp.eth/sdk/core";
import z from "zod";

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
      if (!options.chains[context.chain.id]) {
        if (!hasWarned[context.chain.id]) {
          hasWarned[context.chain.id] = true;
          console.warn(
            `ZeroExSwapResolver: Chain ${context.chain.id} is not supported, skipping...`,
          );
        }

        return null;
      }

      const publicClient = clients[context.chain.id];

      if (!publicClient) {
        throw new Error(
          `ZeroExSwapResolver: Public client for chain ${context.chain.id} not found`,
        );
      }

      // Try to parse swap directly from transaction hash
      // Note: metadata is not available in CommentAdded event, it comes from separate CommentMetadataSet events
      try {
        const parsed = zeroExSwapSchema.safeParse(
          await parseSwap({
            publicClient,
            transactionHash: event.transaction.hash,
          }),
        );

        if (!parsed.success || !parsed.data) {
          // that means the zero ex swap is not getting us the right stuffs even tho they
          // typed that way
          Sentry.captureException(parsed.error, {
            extra: {
              transactionHash: event.transaction.hash,
              chainId: context.chain.id,
            },
          });

          return null;
        }

        const swap = parsed.data;

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
      } catch (e) {
        // we should never allow ex zero swap to cause the whole indexing to fail
        Sentry.captureException(e, {
          extra: {
            erc4337:
              e instanceof Error &&
              e.message.includes("This is an ERC-4337 transaction."),
            transactionHash: event.transaction.hash,
            chainId: context.chain.id,
          },
        });

        return null;
      }
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

const zeroExSwapSchema = z.object({
  tokenIn: z.object({
    symbol: z.string(),
    address: HexSchema,
    amount: z.string(),
  }),
  tokenOut: z.object({
    symbol: z.string(),
    address: HexSchema,
    amount: z.string(),
  }),
});
