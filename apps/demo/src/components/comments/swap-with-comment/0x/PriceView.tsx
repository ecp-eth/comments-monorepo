import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useEffect, useState, useCallback } from "react";
import {
  useReadContract,
  useBalance,
  useSimulateContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { Address, formatUnits, parseUnits, maxUint256 } from "viem";
import {
  BASE_TOKENS,
  BASE_TOKENS_BY_SYMBOL,
  AFFILIATE_FEE,
  FEE_RECIPIENT,
  Token,
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

export const DEFAULT_BUY_TOKEN = (chainId: number) => {
  if (chainId === 1) {
    return "weth";
  }
};

export function PriceView({
  taker,
  setFinalize,
  chainId,
}: {
  taker: Address | undefined;
  setFinalize: (price: PriceResponseLiquidityAvailableSchemaType) => void;
  chainId: number;
}) {
  const [sellToken, setSellToken] = useState("weth");
  const [buyToken, setBuyToken] = useState("usdc");
  const [sellAmount, setSellAmount] = useState("");
  const [buyAmount, setBuyAmount] = useState("");

  const sellTokenObject = BASE_TOKENS_BY_SYMBOL[sellToken];
  const buyTokenObject = BASE_TOKENS_BY_SYMBOL[buyToken];

  const sellTokenDecimals = sellTokenObject.decimals;
  const buyTokenDecimals = buyTokenObject.decimals;

  const parsedSellAmount = sellAmount
    ? parseUnits(sellAmount, sellTokenDecimals).toString()
    : undefined;

  const { data: price } = useQuery({
    enabled: PriceRequestQueryParamsSchema.safeParse({
      chainId,
      sellToken: sellTokenObject.address,
      buyToken: buyTokenObject.address,
      sellAmount: parsedSellAmount,
    }).success,
    queryKey: [
      "price",
      sellTokenObject.address,
      buyTokenObject.address,
      parsedSellAmount,
      taker,
      chainId,
    ],
    queryFn: async ({ signal }) => {
      const params = {
        chainId: chainId.toString(),
        sellToken: sellTokenObject.address,
        buyToken: buyTokenObject.address,
        ...(parsedSellAmount && { sellAmount: parsedSellAmount.toString() }),
        ...(taker && { taker: taker.toString() }),
        swapFeeRecipient: FEE_RECIPIENT,
        swapFeeBps: AFFILIATE_FEE.toString(),
        swapFeeToken: buyTokenObject.address,
        tradeSurplusRecipient: FEE_RECIPIENT,
      };

      const response = await fetch(
        `/api/0x/price?${new URLSearchParams(params).toString()}`,
        { signal }
      );

      const responseData = await response.json();

      if (!response.ok) {
        const parsedResponse =
          SwapAPIBadRequestResponseSchema.safeParse(responseData);

        if (!parsedResponse.success) {
          throw new SwapAPIUnknownError(responseData);
        }

        switch (parsedResponse.data.name) {
          case "INVALID_INPUT":
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
    if (price?.liquidityAvailable) {
      setBuyAmount(formatUnits(price.buyAmount, buyTokenDecimals));
    }
  }, [buyTokenDecimals, price]);

  // Fetch balance information for specified token for a specific taker address
  const { data } = useBalance({
    address: taker,
    token: sellTokenObject.address,
  });

  const handleFinalizeClick = useCallback(() => {
    if (price) {
      setFinalize(price);
    }
  }, [price, setFinalize]);

  const inSufficientBalance =
    data && sellAmount
      ? parseUnits(sellAmount, sellTokenDecimals) > data.value
      : true;

  // Helper function to format tax basis points to percentage
  const formatTax = (taxBps: number) => (taxBps / 100).toFixed(2);

  return (
    <form>
      <div className="p-4 border border-gray-300 rounded mb-4">
        <h2 className="font-semibold mb-2">Swap tokens powered by 0x</h2>

        <Label htmlFor="sell">Sell</Label>
        <section className="mt-4 flex items-start justify-center">
          <label htmlFor="sell-select" className="sr-only">
            Token to sell
          </label>
          <Image
            alt={sellToken}
            className="h-9 w-9 mr-2 rounded-md"
            src={BASE_TOKENS_BY_SYMBOL[sellToken].logoURI}
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
                {BASE_TOKENS.map((token) => {
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
            src={BASE_TOKENS_BY_SYMBOL[buyToken].logoURI}
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
                {BASE_TOKENS.map((token) => {
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
              BASE_TOKENS_BY_SYMBOL[buyToken].decimals
            )}{" "}
            {BASE_TOKENS_BY_SYMBOL[buyToken].symbol}
          </div>
        )}

        {/* Tax Information Display */}
        {((!!price?.tokenMetadata.buyToken &&
          price.tokenMetadata.buyToken.buyTaxBps !== 0) ||
          (!!price?.tokenMetadata.sellToken &&
            price.tokenMetadata.sellToken.sellTaxBps !== 0)) && (
          <div className="text-muted-foreground text-sm mt-4">
            {price.tokenMetadata.buyToken.buyTaxBps != null &&
              price.tokenMetadata.buyToken.buyTaxBps !== 0 && (
                <p>
                  {BASE_TOKENS_BY_SYMBOL[buyToken].symbol +
                    ` Buy Tax: ${formatTax(price.tokenMetadata.buyToken.buyTaxBps)}%`}
                </p>
              )}
            {price.tokenMetadata.sellToken.sellTaxBps != null &&
              price.tokenMetadata.sellToken.sellTaxBps !== 0 && (
                <p>
                  {BASE_TOKENS_BY_SYMBOL[sellToken].symbol +
                    ` Sell Tax: ${formatTax(price.tokenMetadata.sellToken.sellTaxBps)}%`}
                </p>
              )}
          </div>
        )}
      </div>

      <div className="flex justify-end">
        {!taker && <ConnectButton />}

        {!!taker && !!price && price.liquidityAvailable && (
          <ApproveOrReviewButton
            taker={taker}
            onClick={handleFinalizeClick}
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
  onClick,
  sellToken,
  price,
}: {
  disabled: boolean | undefined;
  taker: Address;
  onClick: () => void;
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
    })
      .then((res) => {
        console.log("approval successful", res);
      })
      .catch((e) => {
        console.error(e);

        throw e;
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
        <ReviewButton disabled={disabled} onClick={onClick} />
      )}
    </div>
  );
}

function ReviewButton({
  disabled,
  onClick,
}: {
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      className="ml-auto"
      disabled={disabled}
      onClick={onClick}
      variant="secondary"
    >
      {disabled ? "Insufficient Balance" : "Review Trade"}
    </Button>
  );
}

function ApproveOrReviewButton({
  taker,
  onClick,
  disabled,
  price,
  sellToken,
}: {
  taker: Address;
  onClick: () => void;
  disabled?: boolean;
  price: PriceResponseLiquidityAvailableSchemaType;
  sellToken: Token;
}) {
  if (!price?.issues.allowance) {
    return <ReviewButton disabled={disabled} onClick={onClick} />;
  }

  return (
    <ApproveButton
      disabled={disabled}
      taker={taker}
      onClick={onClick}
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
