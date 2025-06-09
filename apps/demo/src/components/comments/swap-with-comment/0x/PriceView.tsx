import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useEffect, useState, useCallback, useMemo } from "react";
import {
  useReadContract,
  useBalance,
  useSimulateContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { Address, formatUnits, parseUnits, maxUint256 } from "viem";
import {
  getTokensByChain,
  getTokenBySymbolAndChain,
  AFFILIATE_FEE,
  FEE_RECIPIENT,
} from "./constants";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import {
  SwapAPIBadRequestResponseSchema,
  PriceResponseLiquidityAvailableSchemaType,
  PriceResponseSchema,
  PriceRequestQueryParamsSchema,
} from "./schemas";
import {
  SwapAPILiquidityUnavailableError,
  SwapAPITokenNotSupportedError,
  SwapAPIInvalidInputError,
  SwapAPIValidationFailedError,
  SwapAPIUnknownError,
} from "./errors";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Token } from "./types";

export const DEFAULT_BUY_TOKEN = (chainId: number) => {
  if (chainId === 1) {
    return "weth";
  }
};

export type PriceViewState = {
  price: PriceResponseLiquidityAvailableSchemaType;
  from: {
    token: Token;
    amount: string;
  };
  to: {
    token: Token;
    amount: string;
  };
};

export type OnFinalizeFunction = (state: PriceViewState) => void;

export function PriceView({
  taker,
  onFinalize,
  chainId,
}: {
  taker: Address | undefined;
  onFinalize: OnFinalizeFunction;
  chainId: number;
}) {
  const [sellToken, setSellToken] = useState("weth");
  const [buyToken, setBuyToken] = useState("usdc");
  const [sellAmount, setSellAmount] = useState("");
  const [buyAmount, setBuyAmount] = useState("");
  const chainTokens = useMemo(() => getTokensByChain(chainId), [chainId]);

  const sellTokenObject = useMemo(
    () => getTokenBySymbolAndChain(sellToken, chainId),
    [chainId, sellToken],
  );
  const buyTokenObject = useMemo(
    () => getTokenBySymbolAndChain(buyToken, chainId),
    [chainId, buyToken],
  );

  // If either token is not found for the current chain, reset to default tokens
  useEffect(() => {
    if (!sellTokenObject || !buyTokenObject) {
      const defaultToken = chainTokens[0]?.symbol.toLowerCase();
      const secondToken = chainTokens[1]?.symbol.toLowerCase();

      if (defaultToken) {
        setSellToken(defaultToken);

        if (secondToken) {
          setBuyToken(secondToken);
        }
      }
    }
  }, [chainId, sellTokenObject, buyTokenObject, chainTokens]);

  const parsedSellAmount =
    sellAmount && sellTokenObject
      ? parseUnits(sellAmount, sellTokenObject.decimals).toString()
      : undefined;

  const parsedParams = PriceRequestQueryParamsSchema.safeParse({
    chainId,
    sellToken: sellTokenObject?.address,
    buyToken: buyTokenObject?.address,
    sellAmount: parsedSellAmount,
  });

  const { data: price, error: priceError } = useQuery({
    enabled: parsedParams.success,
    queryKey: parsedParams.success
      ? [
          "price",
          parsedParams.data.sellToken,
          parsedParams.data.buyToken,
          parsedParams.data.sellAmount.toString(),
          taker,
          chainId,
        ]
      : ["price", "unsupported"],
    queryFn: async ({ signal }) => {
      if (!parsedParams.success) {
        throw new Error("Invalid parameters");
      }

      const params = {
        chainId: chainId.toString(),
        sellToken: parsedParams.data.sellToken,
        buyToken: parsedParams.data.buyToken,
        ...(parsedSellAmount && { sellAmount: parsedSellAmount.toString() }),
        ...(taker && { taker: taker.toString() }),
        swapFeeRecipient: FEE_RECIPIENT,
        swapFeeBps: AFFILIATE_FEE.toString(),
        swapFeeToken: parsedParams.data.buyToken,
        tradeSurplusRecipient: FEE_RECIPIENT,
      };

      const response = await fetch(
        `/api/0x/price?${new URLSearchParams(params).toString()}`,
        { signal },
      );

      const responseData = await response.json();

      if (!response.ok) {
        const parsedResponse =
          SwapAPIBadRequestResponseSchema.safeParse(responseData);

        if (!parsedResponse.success) {
          throw new SwapAPIUnknownError(responseData);
        }

        switch (parsedResponse.data.name) {
          case "INPUT_INVALID":
            throw new SwapAPIInvalidInputError(parsedResponse.data);
          case "SWAP_VALIDATION_FAILED":
            throw new SwapAPIValidationFailedError(parsedResponse.data);
          case "TOKEN_NOT_SUPPORTED":
            throw new SwapAPITokenNotSupportedError(parsedResponse.data);
          default:
            throw new SwapAPIUnknownError(responseData);
        }
      }

      const priceData = PriceResponseSchema.parse(responseData);

      if (!priceData.liquidityAvailable) {
        throw new SwapAPILiquidityUnavailableError();
      }

      return priceData;
    },
    staleTime: 0,
  });

  useEffect(() => {
    if (price?.liquidityAvailable && buyTokenObject) {
      setBuyAmount(formatUnits(price.buyAmount, buyTokenObject.decimals));
    }
  }, [buyTokenObject, price]);

  // Fetch balance information for specified token for a specific taker address
  const { data } = useBalance({
    address: taker,
    token: sellTokenObject?.address,
  });

  const handleFinalizeClick = useCallback(() => {
    if (price && sellTokenObject && buyTokenObject) {
      onFinalize({
        price,
        from: {
          token: sellTokenObject,
          amount: sellAmount,
        },
        to: {
          token: buyTokenObject,
          amount: buyAmount,
        },
      });
    }
  }, [
    buyAmount,
    buyTokenObject,
    price,
    sellAmount,
    sellTokenObject,
    onFinalize,
  ]);

  // If no tokens are available for this chain, show unsupported message
  if (chainTokens.length === 0) {
    return (
      <div className="p-4 border border-gray-300 rounded mb-4">
        <h2 className="font-semibold mb-2">Swap tokens</h2>
        <div className="text-red-500">
          <p>Token swaps are not supported on this chain.</p>
        </div>
      </div>
    );
  }

  // If we don't have valid token objects, don't proceed
  if (!sellTokenObject || !buyTokenObject) {
    return null;
  }

  const inSufficientBalance =
    data && sellAmount
      ? parseUnits(sellAmount, sellTokenObject.decimals) > data.value
      : true;

  // Helper function to format tax basis points to percentage
  const formatTax = (taxBps: number) => (taxBps / 100).toFixed(2);

  return (
    <form>
      <div className="p-4 border border-gray-300 rounded mb-4">
        <h2 className="font-semibold mb-2">Swap tokens</h2>

        <Label htmlFor="sell">Sell</Label>
        <section className="mt-4 flex items-start justify-center">
          <label htmlFor="sell-select" className="sr-only">
            Token to sell
          </label>
          <Image
            alt={sellToken}
            className="h-9 w-9 mr-2 rounded-md"
            src={sellTokenObject.logoURI}
            width={9}
            height={9}
          />

          <div className="h-14 sm:w-full sm:mr-2">
            <Select
              onValueChange={(token) => setSellToken(token)}
              value={sellToken}
            >
              <SelectTrigger id="sell-token-select">
                <SelectValue placeholder="Select token to sell" />
              </SelectTrigger>
              <SelectContent>
                {chainTokens.map((token) => {
                  return (
                    <SelectItem
                      key={token.address}
                      value={token.symbol.toLowerCase()}
                    >
                      {token.symbol}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <label htmlFor="sell-amount" className="sr-only">
            Sell amount
          </label>
          <Input
            id="sell-amount"
            value={sellAmount}
            type="number"
            onChange={(e) => {
              setSellAmount(e.target.value);
            }}
          />
        </section>
        <Label htmlFor="buy">Buy</Label>
        <section className="flex mt-4 items-start justify-center">
          <label htmlFor="buy-token" className="sr-only">
            Token to buy
          </label>
          <Image
            alt={buyToken}
            className="h-9 w-9 mr-2 rounded-md"
            src={buyTokenObject.logoURI}
            width={9}
            height={9}
          />
          <div className="h-14 sm:w-full sm:mr-2">
            <Select
              onValueChange={(token) => setBuyToken(token)}
              value={buyToken}
            >
              <SelectTrigger id="buy-token-select">
                <SelectValue placeholder="Select token to buy" />
              </SelectTrigger>
              <SelectContent>
                {chainTokens.map((token) => {
                  return (
                    <SelectItem
                      key={token.address}
                      value={token.symbol.toLowerCase()}
                    >
                      {token.symbol}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <label htmlFor="buy-amount" className="sr-only">
            Buy amount
          </label>
          <Input id="buy-amount" value={buyAmount} type="number" readOnly />
        </section>

        {price && price.fees?.integratorFee?.amount && (
          <div className="text-muted-foreground text-sm mt-4">
            Affiliate Fee:{" "}
            {formatUnits(
              BigInt(price.fees.integratorFee.amount),
              buyTokenObject.decimals,
            )}{" "}
            {buyTokenObject.symbol}
          </div>
        )}

        {((!!price?.tokenMetadata.buyToken &&
          price.tokenMetadata.buyToken.buyTaxBps !== 0) ||
          (!!price?.tokenMetadata.sellToken &&
            price.tokenMetadata.sellToken.sellTaxBps !== 0)) && (
          <div className="text-muted-foreground text-sm mt-4">
            {price.tokenMetadata.buyToken.buyTaxBps != null &&
              price.tokenMetadata.buyToken.buyTaxBps !== 0 && (
                <p>
                  {buyTokenObject.symbol +
                    ` Buy Tax: ${formatTax(price.tokenMetadata.buyToken.buyTaxBps)}%`}
                </p>
              )}
            {price.tokenMetadata.sellToken.sellTaxBps != null &&
              price.tokenMetadata.sellToken.sellTaxBps !== 0 && (
                <p>
                  {sellTokenObject.symbol +
                    ` Sell Tax: ${formatTax(price.tokenMetadata.sellToken.sellTaxBps)}%`}
                </p>
              )}
          </div>
        )}

        {priceError && (
          <div className="text-red-500 text-sm mt-4">{priceError.message}</div>
        )}
      </div>

      <div className="flex justify-end">
        {!taker && <ConnectButton />}

        {!!taker && !!price && price.liquidityAvailable && (
          <ApproveOrReviewButton
            taker={taker}
            onReviewClick={handleFinalizeClick}
            disabled={inSufficientBalance}
            price={price}
            sellToken={sellTokenObject}
          />
        )}

        {!!taker && !!price && !price.liquidityAvailable && (
          <div className="text-red-500">
            <p>No liquidity available for this trade.</p>
          </div>
        )}
      </div>
    </form>
  );
}

function ApproveButton({
  disabled,
  taker,
  onReviewClick,
  sellToken,
  price,
}: {
  disabled: boolean | undefined;
  taker: Address;
  onReviewClick: () => void;
  sellToken: Token;
  price: Omit<PriceResponseLiquidityAvailableSchemaType, "issues"> & {
    issues: Omit<
      PriceResponseLiquidityAvailableSchemaType["issues"],
      "allowance"
    > & {
      allowance: {
        spender: Address;
      };
    };
  };
}) {
  const {
    data: approvalData,
    writeContractAsync: approveAllowance,
    error: approveAllowanceError,
    isPending: isWritingApproval,
  } = useWriteContract();

  const { data } = useSimulateContract({
    address: sellToken.address,
    abi: sellToken.abi,
    functionName: "approve",
    args: [price.issues.allowance.spender, maxUint256],
  });

  const approvalReceipt = useWaitForTransactionReceipt({
    hash: approvalData,
  });

  const {
    data: allowance,
    isLoading: isLoadingAllowance,
    refetch: refetchAllowance,
  } = useReadContract({
    address: sellToken.address,
    abi: sellToken.abi,
    functionName: "allowance",
    args: [taker, price.issues.allowance.spender],
  });

  const handleApproveClick = useCallback(async () => {
    if (allowance !== 0n) {
      return;
    }

    await approveAllowance({
      abi: sellToken.abi,
      address: sellToken.address,
      functionName: "approve",
      args: [price.issues.allowance.spender, maxUint256],
    });

    refetchAllowance();
  }, [
    allowance,
    approveAllowance,
    sellToken.abi,
    sellToken.address,
    price.issues.allowance.spender,
    refetchAllowance,
  ]);

  useEffect(() => {
    if (data) {
      refetchAllowance();
    }
  }, [data, refetchAllowance]);

  if (isLoadingAllowance) {
    return (
      <Button disabled={disabled} type="button" variant="secondary">
        Checking allowance...
      </Button>
    );
  }

  const insufficientAllowance = (allowance as bigint) < price.sellAmount;

  return (
    <div className="flex flex-col gap-2">
      {(approveAllowanceError || approvalReceipt.error) && (
        <div className="text-red-500 text-sm">
          Something went wrong:{" "}
          {
            (
              approveAllowanceError ||
              approvalReceipt.error ||
              new Error("unknown error")
            ).message
          }
        </div>
      )}
      {insufficientAllowance ? (
        <Button
          className="ml-auto"
          disabled={isWritingApproval || approvalReceipt.isLoading}
          type="button"
          onClick={handleApproveClick}
          variant="secondary"
        >
          {isWritingApproval || approvalReceipt.isLoading
            ? "Approving..."
            : "Approve"}
        </Button>
      ) : (
        <ReviewButton disabled={disabled} onReviewClick={onReviewClick} />
      )}
    </div>
  );
}

function ReviewButton({
  disabled,
  onReviewClick,
}: {
  disabled?: boolean;
  onReviewClick: () => void;
}) {
  return (
    <Button
      className="ml-auto"
      disabled={disabled}
      onClick={onReviewClick}
      variant="secondary"
    >
      {disabled ? "Insufficient Balance" : "Review Trade"}
    </Button>
  );
}

function ApproveOrReviewButton({
  taker,
  onReviewClick,
  disabled,
  price,
  sellToken,
}: {
  taker: Address;
  onReviewClick: () => void;
  disabled?: boolean;
  price: PriceResponseLiquidityAvailableSchemaType;
  sellToken: Token;
}) {
  if (!price?.issues.allowance) {
    return <ReviewButton disabled={disabled} onReviewClick={onReviewClick} />;
  }

  return (
    <ApproveButton
      disabled={disabled}
      taker={taker}
      onReviewClick={onReviewClick}
      sellToken={sellToken}
      price={
        price as Omit<PriceResponseLiquidityAvailableSchemaType, "issues"> & {
          issues: Omit<
            PriceResponseLiquidityAvailableSchemaType["issues"],
            "allowance"
          > & {
            allowance: {
              spender: Address;
            };
          };
        }
      }
    />
  );
}
