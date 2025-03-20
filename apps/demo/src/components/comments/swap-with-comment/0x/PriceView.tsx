import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useEffect, useState, ChangeEvent } from "react";
import {
  useReadContract,
  useBalance,
  useSimulateContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { erc20Abi, Address, formatUnits, parseUnits } from "viem";
import {
  BASE_TOKENS,
  BASE_TOKENS_BY_SYMBOL,
  MAX_ALLOWANCE,
  AFFILIATE_FEE,
  FEE_RECIPIENT,
} from "@/lib/constants";
import ZeroExLogo from "./white-0x-logo.png";
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
  const [tradeDirection, setTradeDirection] = useState("sell");

  const handleSellTokenChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setSellToken(e.target.value);
  };
  function handleBuyTokenChange(e: ChangeEvent<HTMLSelectElement>) {
    setBuyToken(e.target.value);
  }

  const sellTokenObject = BASE_TOKENS_BY_SYMBOL[sellToken];
  console.log("sellTokenObject", sellTokenObject);
  const buyTokenObject = BASE_TOKENS_BY_SYMBOL[buyToken];

  const sellTokenDecimals = sellTokenObject.decimals;
  const buyTokenDecimals = buyTokenObject.decimals;
  const sellTokenAddress = sellTokenObject.address;

  const parsedSellAmount =
    sellAmount && tradeDirection === "sell"
      ? parseUnits(sellAmount, sellTokenDecimals).toString()
      : undefined;

  const parsedBuyAmount =
    buyAmount && tradeDirection === "buy"
      ? parseUnits(buyAmount, buyTokenDecimals).toString()
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
      parsedBuyAmount,
      taker,
      chainId,
    ],
    queryFn: async ({ signal }) => {
      const params = {
        chainId: chainId.toString(),
        sellToken: sellTokenObject.address,
        buyToken: buyTokenObject.address,
        ...(parsedSellAmount && { sellAmount: parsedSellAmount.toString() }),
        ...(parsedBuyAmount && { buyAmount: parsedBuyAmount.toString() }),
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

  console.log("taker sellToken balance: ", data);

  const inSufficientBalance =
    data && sellAmount
      ? parseUnits(sellAmount, sellTokenDecimals) > data.value
      : true;

  // Helper function to format tax basis points to percentage
  const formatTax = (taxBps: number) => (taxBps / 100).toFixed(2);

  return (
    <div>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <a href="https://0x.org/" target="_blank" rel="noopener noreferrer">
          <Image src={ZeroExLogo} alt="Icon" width={50} height={50} />
        </a>
        <ConnectButton />
      </header>

      <div className="container mx-auto p-10">
        <header className="text-center py-4">
          <h1 className="text-3xl font-bold">0x Swap Demo</h1>
        </header>

        <p className="text-md text-center p-4 text-gray-500">
          Check out the{" "}
          <u className="underline">
            <a href="https://0x.org/docs/">0x Docs</a>
          </u>{" "}
          and{" "}
          <u className="underline">
            <a href="https://github.com/0xProject/0x-examples/tree/main">
              Code
            </a>
          </u>{" "}
          to build your own
        </p>

        <div className="bg-slate-200 dark:bg-slate-800 p-4 rounded-md mb-3">
          <label htmlFor="sell" className="text-gray-300 mb-2 mr-2">
            Sell
          </label>
          <section className="mt-4 flex items-start justify-center">
            <label htmlFor="sell-select" className="sr-only"></label>
            <Image
              alt={sellToken}
              className="h-9 w-9 mr-2 rounded-md"
              src={BASE_TOKENS_BY_SYMBOL[sellToken].logoURI}
              width={9}
              height={9}
            />

            <div className="h-14 sm:w-full sm:mr-2">
              <select
                value={sellToken}
                name="sell-token-select"
                id="sell-token-select"
                className="mr-2 w-50 sm:w-full h-9 rounded-md"
                onChange={handleSellTokenChange}
              >
                {/* <option value="">--Choose a token--</option> */}
                {BASE_TOKENS.map((token) => {
                  return (
                    <option
                      key={token.address}
                      value={token.symbol.toLowerCase()}
                    >
                      {token.symbol}
                    </option>
                  );
                })}
              </select>
            </div>
            <label htmlFor="sell-amount" className="sr-only"></label>
            <input
              id="sell-amount"
              value={sellAmount}
              className="h-9 rounded-md"
              style={{ border: "1px solid black" }}
              type="number"
              onChange={(e) => {
                setTradeDirection("sell");
                setSellAmount(e.target.value);
              }}
            />
          </section>
          <label htmlFor="buy" className="text-gray-300 mb-2 mr-2">
            Buy
          </label>
          <section className="flex mb-6 mt-4 items-start justify-center">
            <label htmlFor="buy-token" className="sr-only"></label>
            <Image
              alt={buyToken}
              className="h-9 w-9 mr-2 rounded-md"
              src={BASE_TOKENS_BY_SYMBOL[buyToken].logoURI}
              width={9}
              height={9}
            />
            <select
              name="buy-token-select"
              id="buy-token-select"
              value={buyToken}
              className="mr-2 w-50 sm:w-full h-9 rounded-md"
              onChange={(e) => handleBuyTokenChange(e)}
            >
              {BASE_TOKENS.map((token) => {
                return (
                  <option
                    key={token.address}
                    value={token.symbol.toLowerCase()}
                  >
                    {token.symbol}
                  </option>
                );
              })}
            </select>
            <label htmlFor="buy-amount" className="sr-only"></label>
            <input
              id="buy-amount"
              value={buyAmount}
              className="h-9 rounded-md bg-white cursor-not-allowed"
              type="number"
              style={{ border: "1px solid black" }}
              disabled
              onChange={(e) => {
                setTradeDirection("buy");
                setBuyAmount(e.target.value);
              }}
            />
          </section>

          {/* Affiliate Fee Display */}
          {price && price.fees?.integratorFee?.amount && (
            <div className="text-slate-400">
              Affiliate Fee:{" "}
              {formatUnits(
                BigInt(price.fees.integratorFee.amount),
                BASE_TOKENS_BY_SYMBOL[buyToken].decimals
              )}{" "}
              {BASE_TOKENS_BY_SYMBOL[buyToken].symbol}
            </div>
          )}

          {/* Tax Information Display */}
          {(!!price?.tokenMetadata.buyToken ||
            !!price?.tokenMetadata.sellToken) && (
            <div className="text-slate-400">
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

        {!taker && (
          <ConnectButton.Custom>
            {({
              account,
              chain,
              openAccountModal,
              openChainModal,
              openConnectModal,
              mounted,
            }) => {
              const ready = mounted;
              const connected = ready && account && chain;

              return (
                <div
                  {...(!ready && {
                    "aria-hidden": true,
                    style: {
                      opacity: 0,
                      pointerEvents: "none",
                      userSelect: "none",
                    },
                  })}
                >
                  {(() => {
                    if (!connected) {
                      return (
                        <button
                          className="w-full bg-blue-600 text-white font-semibold p-2 rounded hover:bg-blue-700"
                          onClick={openConnectModal}
                          type="button"
                        >
                          Connect Wallet
                        </button>
                      );
                    }

                    if (chain.unsupported) {
                      return (
                        <button onClick={openChainModal} type="button">
                          Wrong network
                        </button>
                      );
                    }

                    return (
                      <div style={{ display: "flex", gap: 12 }}>
                        <button
                          onClick={openChainModal}
                          style={{ display: "flex", alignItems: "center" }}
                          type="button"
                        >
                          {chain.hasIcon && (
                            <div
                              style={{
                                background: chain.iconBackground,
                                width: 12,
                                height: 12,
                                borderRadius: 999,
                                overflow: "hidden",
                                marginRight: 4,
                              }}
                            >
                              {chain.iconUrl && (
                                <Image
                                  src={chain.iconUrl}
                                  alt={chain.name ?? "Chain icon"}
                                  width={12}
                                  height={12}
                                  layout="fixed"
                                />
                              )}
                            </div>
                          )}
                          {chain.name}
                        </button>

                        <button onClick={openAccountModal} type="button">
                          {account.displayName}
                          {account.displayBalance
                            ? ` (${account.displayBalance})`
                            : ""}
                        </button>
                      </div>
                    );
                  })()}
                </div>
              );
            }}
          </ConnectButton.Custom>
        )}

        {!!taker && !!price && price?.liquidityAvailable && (
          <ApproveOrReviewButton
            sellTokenAddress={sellTokenAddress}
            taker={taker}
            onClick={() => {
              setFinalize(price);
            }}
            disabled={inSufficientBalance}
            price={price}
          />
        )}

        {!!taker && !!price && !price?.liquidityAvailable && (
          <div>
            <p>No liquidity available for this trade.</p>
          </div>
        )}
      </div>
    </div>
  );

  function ApproveButton({
    taker,
    sellTokenAddress,
    spender,
  }: {
    taker: Address;
    sellTokenAddress: Address;
    spender: Address;
  }) {
    const approveContract = useWriteContract();

    const { data } = useSimulateContract({
      address: sellTokenAddress,
      abi: erc20Abi,
      functionName: "approve",
      args: [spender, MAX_ALLOWANCE],
    });

    const approvalReceipt = useWaitForTransactionReceipt({
      hash: approveContract.data,
    });

    const { data: allowance, refetch } = useReadContract({
      address: sellTokenAddress,
      abi: erc20Abi,
      functionName: "allowance",
      args: [taker, spender],
    });

    useEffect(() => {
      if (data) {
        refetch();
      }
    }, [data, refetch]);

    if (approveContract.error || approvalReceipt.error) {
      return (
        <div>
          Something went wrong:{" "}
          {
            (
              approveContract.error ||
              approvalReceipt.error ||
              new Error("unknown error")
            ).message
          }
        </div>
      );
    }

    if (allowance === 0n) {
      return (
        <button
          type="button"
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded w-full"
          onClick={async () => {
            await approveContract.writeContractAsync({
              abi: erc20Abi,
              address: sellTokenAddress,
              functionName: "approve",
              args: [spender, MAX_ALLOWANCE],
            });
            console.log("approving spender to spend sell token");
            refetch();
          }}
        >
          {approveContract.isPending || approvalReceipt.isLoading
            ? "Approving…"
            : "Approve"}
        </button>
      );
    }

    return null;
  }

  function ReviewButton({
    disabled,
    onClick,
  }: {
    disabled?: boolean;
    onClick: () => void;
  }) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-700 disabled:opacity-25"
      >
        {disabled ? "Insufficient Balance" : "Review Trade"}
      </button>
    );
  }

  function ApproveOrReviewButton({
    taker,
    onClick,
    sellTokenAddress,
    disabled,
    price,
  }: {
    taker: Address;
    onClick: () => void;
    sellTokenAddress: Address;
    disabled?: boolean;
    price: PriceResponseLiquidityAvailableSchemaType;
  }) {
    const spender = price.issues.allowance?.spender;

    if (!price?.issues.allowance || !spender) {
      return <ReviewButton disabled={disabled} onClick={onClick} />;
    }

    return (
      <ApproveButton
        taker={taker}
        sellTokenAddress={sellTokenAddress}
        spender={spender}
      />
    );
  }
}
