import { type Address, formatUnits } from "viem";
import {
  BASE_TOKENS_BY_ADDRESS,
  AFFILIATE_FEE,
  FEE_RECIPIENT,
} from "./constants";
import Image from "next/image";
import {
  PriceResponseLiquidityAvailableSchemaType,
  QuoteRequestQueryParamsSchema,
  QuoteResponseLiquidityAvailableSchemaType,
  QuoteResponseSchema,
  SwapAPIBadRequestResponseSchema,
} from "./schemas";
import { useQuery } from "@tanstack/react-query";
import {
  SwapAPILiquidityUnavailableError,
  SwapAPIUnknownError,
  SwapAPIInvalidInputError,
  SwapAPIValidationFailedError,
  SwapAPITokenNotSupportedError,
} from "./errors";
import { useEffect } from "react";

export default function QuoteView({
  taker,
  price,
  setQuote,
  chainId,
}: {
  taker: Address | undefined;
  price: PriceResponseLiquidityAvailableSchemaType;
  setQuote: (quote: QuoteResponseLiquidityAvailableSchemaType) => void;
  chainId: number;
}) {
  const sellTokenInfo = BASE_TOKENS_BY_ADDRESS[price.sellToken.toLowerCase()];
  const buyTokenInfo = BASE_TOKENS_BY_ADDRESS[price.buyToken.toLowerCase()];

  const quoteQuery = useQuery({
    enabled: QuoteRequestQueryParamsSchema.safeParse({
      chainId,
      sellToken: price.sellToken.toString(),
      buyToken: price.buyToken.toString(),
      sellAmount: price.sellAmount.toString(),
      taker,
    }).success,
    queryKey: [
      "quote",
      price.sellToken,
      price.buyToken,
      price.sellAmount.toString(),
    ],
    queryFn: async ({ signal }) => {
      const params = {
        chainId: chainId.toString(),
        sellToken: price.sellToken.toString(),
        buyToken: price.buyToken.toString(),
        sellAmount: price.sellAmount.toString(),
        ...(taker && { taker: taker.toString() }),
        swapFeeRecipient: FEE_RECIPIENT,
        swapFeeBps: AFFILIATE_FEE.toString(),
        swapFeeToken: price.buyToken,
        tradeSurplusRecipient: FEE_RECIPIENT,
      };

      const response = await fetch(
        `/api/0x/quote?${new URLSearchParams(params).toString()}`,
        { signal }
      );
      const data = await response.json();

      if (!response.ok) {
        const parsedResponse = SwapAPIBadRequestResponseSchema.safeParse(data);

        if (!parsedResponse.success) {
          throw new SwapAPIUnknownError(data);
        }

        switch (parsedResponse.data.name) {
          case "INPUT_INVALID":
            throw new SwapAPIInvalidInputError(parsedResponse.data);
          case "SWAP_VALIDATION_FAILED":
            throw new SwapAPIValidationFailedError(parsedResponse.data);
          case "TOKEN_NOT_SUPPORTED":
            throw new SwapAPITokenNotSupportedError(parsedResponse.data);
          default:
            throw new SwapAPIUnknownError(data);
        }
      }

      const result = QuoteResponseSchema.parse(data);

      if (!result.liquidityAvailable) {
        throw new SwapAPILiquidityUnavailableError();
      }

      return result;
    },
    staleTime: 0,
  });

  useEffect(() => {
    if (quoteQuery.data) {
      setQuote(quoteQuery.data);
    }
  }, [quoteQuery.data, setQuote]);

  if (quoteQuery.isLoading) {
    return <div>Getting best quote...</div>;
  }

  if (quoteQuery.isError) {
    return (
      <div className="text-red-500 text-sm">{quoteQuery.error.message}</div>
    );
  }

  if (!quoteQuery.isSuccess) {
    return null;
  }

  const quote = quoteQuery.data;

  // Helper function to format tax basis points to percentage
  const formatTax = (taxBps: number) => (taxBps / 100).toFixed(2);

  return (
    <div className="">
      <form>
        <div className="flex flex-col gap-2 p-4 border border-gray-300 rounded mb-4">
          <div className="font-semibold">You pay</div>
          <div className="flex gap-2 items-center">
            <Image
              alt={sellTokenInfo.symbol}
              className="h-5 w-5 rounded-md"
              src={sellTokenInfo.logoURI}
              width={16}
              height={16}
            />
            <span>
              {formatUnits(BigInt(quote.sellAmount), sellTokenInfo.decimals)}
            </span>
            <div>{sellTokenInfo.symbol}</div>
          </div>
        </div>

        <div className="flex flex-col gap-2 p-4 border border-gray-300 rounded mb-4">
          <div className="font-semibold">You receive</div>
          <div className="flex gap-2 items-center">
            <Image
              alt={buyTokenInfo.symbol}
              className="h-5 w-5 rounded-md"
              src={buyTokenInfo.logoURI}
              width={16}
              height={16}
            />
            <span>{formatUnits(quote.buyAmount, buyTokenInfo.decimals)}</span>
            <div>{buyTokenInfo.symbol}</div>
          </div>
        </div>

        <div className="flex flex-col gap-2 p-4 border border-gray-300 rounded mb-4">
          <div className="text-muted-foreground text-sm">
            {quote.fees &&
            quote.fees.integratorFee &&
            quote.fees.integratorFee.amount
              ? "Affiliate Fee: " +
                formatUnits(
                  quote.fees.integratorFee.amount,
                  buyTokenInfo.decimals
                ) +
                " " +
                buyTokenInfo.symbol
              : null}
          </div>
          {((!!quote.tokenMetadata.buyToken &&
            quote.tokenMetadata.buyToken.buyTaxBps !== 0) ||
            (!!quote.tokenMetadata.sellToken &&
              quote.tokenMetadata.sellToken.sellTaxBps !== 0)) && (
            <div className="text-muted-foreground text-sm mt-4">
              {quote.tokenMetadata.buyToken.buyTaxBps != null &&
                quote.tokenMetadata.buyToken.buyTaxBps !== 0 && (
                  <p>
                    {buyTokenInfo.symbol +
                      ` Buy Tax: ${formatTax(quote.tokenMetadata.buyToken.buyTaxBps)}%`}
                  </p>
                )}
              {quote.tokenMetadata.sellToken.sellTaxBps != null &&
                quote.tokenMetadata.sellToken.sellTaxBps !== 0 && (
                  <p>
                    {sellTokenInfo.symbol +
                      ` Sell Tax: ${formatTax(
                        quote.tokenMetadata.sellToken.sellTaxBps
                      )}%`}
                  </p>
                )}
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
