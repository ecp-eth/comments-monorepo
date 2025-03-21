import { HexSchema } from "@ecp.eth/sdk/schemas";
import { z } from "zod";

const AddressSchema = HexSchema;

/**
 * Minimum set of parameters you need to send to endpoint to get a price
 */
export const PriceRequestQueryParamsSchema = z.object({
  chainId: z.number(),
  buyToken: AddressSchema,
  sellToken: AddressSchema,
  sellAmount: z.coerce.bigint(),
});

/**
 * Minimum set of parameters you need to send to endpoint to get a quote
 */
export const QuoteRequestQueryParamsSchema =
  PriceRequestQueryParamsSchema.extend({
    taker: AddressSchema,
  });

const Permit2Schema = z.object({
  type: z.literal("Permit2"),
  hash: HexSchema,
  eip712: z.any(),
});

const IssuesSchema = z.object({
  allowance: z
    .object({
      actual: z.coerce.bigint(),
      spender: AddressSchema,
    })
    .nullable(),
  balance: z
    .object({
      token: AddressSchema,
      actual: z.coerce.bigint(),
      expected: z.coerce.bigint(),
    })
    .nullable(),
  simulationIncomplete: z.boolean(),
  invalidSourcesPassed: z.array(z.string()),
});

const TokenMetadataSchema = z.object({
  buyToken: z.object({
    buyTaxBps: z.coerce.number().nullable(),
    sellTaxBps: z.coerce.number().nullable(),
  }),
  sellToken: z.object({
    buyTaxBps: z.coerce.number().nullable(),
    sellTaxBps: z.coerce.number().nullable(),
  }),
});

const RouteSchema = z.object({
  fills: z.array(
    z.object({
      from: AddressSchema,
      to: AddressSchema,
      source: z.string(),
      proportionBps: z.coerce.bigint(),
    })
  ),
  tokens: z.array(
    z.object({
      address: AddressSchema,
      symbol: z.string(),
    })
  ),
});

const FeesSchema = z.object({
  integratorFee: z
    .object({
      amount: z.coerce.bigint(),
      token: AddressSchema,
      type: z.literal("volume"),
    })
    .nullable(),
  zeroExFee: z.object({
    amount: z.coerce.bigint(),
    token: AddressSchema,
    type: z.literal("volume"),
  }),
  gasFee: z
    .object({
      amount: z.coerce.bigint(),
      token: AddressSchema,
      type: z.literal("gas"),
    })
    .nullable(),
});

const TransactionSchema = z.object({
  data: HexSchema,
  gas: z.coerce.bigint().nullable(),
  gasPrice: z.coerce.bigint(),
  to: AddressSchema,
  value: z.coerce.bigint(),
});

const PriceResponseLiquidityAvailableSchema = z.object({
  liquidityAvailable: z.literal(true),
  blockNumber: z.coerce.bigint(),
  sellToken: AddressSchema,
  sellAmount: z.coerce.bigint(),
  buyAmount: z.coerce.bigint(),
  buyToken: AddressSchema,
  minBuyAmount: z.coerce.bigint(),
  totalNetworkFee: z.coerce.bigint(),
  tokenMetadata: TokenMetadataSchema,
  issues: IssuesSchema,
  route: RouteSchema,
  fees: FeesSchema,
  gas: z.coerce.bigint().nullable(),
  gasPrice: z.coerce.bigint(),
});

export type PriceResponseLiquidityAvailableSchemaType = z.infer<
  typeof PriceResponseLiquidityAvailableSchema
>;

const PriceResponseLiquidityUnavailableSchema = z.object({
  liquidityAvailable: z.literal(false),
});

export type PriceResponseLiquidityUnavailableSchemaType = z.infer<
  typeof PriceResponseLiquidityUnavailableSchema
>;

export const PriceResponseSchema = z.discriminatedUnion("liquidityAvailable", [
  PriceResponseLiquidityAvailableSchema,
  PriceResponseLiquidityUnavailableSchema,
]);

export const SwapAPIInvalidInputResponseSchema = z.object({
  name: z.literal("INPUT_INVALID"),
  message: z.string(),
  data: z.object({
    zid: z.string(),
    details: z.array(
      z.object({
        field: z.string(),
        reason: z.string(),
      })
    ),
  }),
});

export type SwapAPIInvalidInputResponseSchemaType = z.infer<
  typeof SwapAPIInvalidInputResponseSchema
>;

export const SwapAPIValidationFailedResponseSchema = z.object({
  name: z.literal("SWAP_VALIDATION_FAILED"),
  message: z.string(),
  data: z.object({
    zid: z.string(),
  }),
});

export type SwapAPIValidationFailedResponseSchemaType = z.infer<
  typeof SwapAPIValidationFailedResponseSchema
>;

export const SwapAPITokenNotSupportedResponseSchema = z.object({
  name: z.literal("TOKEN_NOT_SUPPORTED"),
  message: z.string(),
  data: z.object({
    zid: z.string(),
  }),
});

export type SwapAPITokenNotSupportedResponseSchemaType = z.infer<
  typeof SwapAPITokenNotSupportedResponseSchema
>;

export const SwapAPIBadRequestResponseSchema = z.discriminatedUnion("name", [
  SwapAPIInvalidInputResponseSchema,
  SwapAPIValidationFailedResponseSchema,
  SwapAPITokenNotSupportedResponseSchema,
]);

export type PriceResponseSchemaType = z.infer<typeof PriceResponseSchema>;
export type SwapAPIBadRequestResponseSchemaType = z.infer<
  typeof SwapAPIBadRequestResponseSchema
>;

const QuoteResponseLiquidityAvailableSchema = z.object({
  liquidityAvailable: z.literal(true),
  blockNumber: z.coerce.bigint(),
  buyAmount: z.coerce.bigint(),
  buyToken: AddressSchema,
  minBuyAmount: z.coerce.bigint(),
  sellAmount: z.coerce.bigint(),
  sellToken: AddressSchema,
  totalNetworkFee: z.coerce.bigint(),
  tokenMetadata: TokenMetadataSchema,
  issues: IssuesSchema,
  route: RouteSchema,
  fees: FeesSchema,
  permit2: Permit2Schema,
  transaction: TransactionSchema,
});

export type QuoteResponseLiquidityAvailableSchemaType = z.infer<
  typeof QuoteResponseLiquidityAvailableSchema
>;

const QuoteResponseLiquidityUnavailableSchema = z.object({
  liquidityAvailable: z.literal(false),
});

export type QuoteResponseLiquidityUnavailableSchemaType = z.infer<
  typeof QuoteResponseLiquidityUnavailableSchema
>;

export const QuoteResponseSchema = z.discriminatedUnion("liquidityAvailable", [
  QuoteResponseLiquidityAvailableSchema,
  QuoteResponseLiquidityUnavailableSchema,
]);

export type QuoteResponseSchemaType = z.infer<typeof QuoteResponseSchema>;
export type TransactionSchemaType = z.infer<typeof TransactionSchema>;
