import { useEffect } from "react";
import {
  useSignTypedData,
  useSendTransaction,
  useWaitForTransactionReceipt,
  useWalletClient,
  type BaseError,
} from "wagmi";
import {
  Address,
  concat,
  formatUnits,
  numberToHex,
  size,
  type Hex,
} from "viem";
import {
  MAINNET_TOKENS_BY_ADDRESS,
  AFFILIATE_FEE,
  FEE_RECIPIENT,
} from "@/lib/constants";
import Image from "next/image";
import type { PriceResponse, QuoteResponse } from "./types";

export default function QuoteView({
  taker,
  price,
  quote,
  setQuote,
  chainId,
}: {
  taker: Address | undefined;
  price: PriceResponse;
  quote: QuoteResponse | undefined;
  setQuote: (price: any) => void;
  chainId: number;
}) {
  console.log("price", price);

  const sellTokenInfo = (chainId: number) => {
    if (chainId === 1) {
      return MAINNET_TOKENS_BY_ADDRESS[price.sellToken.toLowerCase()];
    }
    return MAINNET_TOKENS_BY_ADDRESS[price.sellToken.toLowerCase()];
  };

  const buyTokenInfo = (chainId: number) => {
    if (chainId === 1) {
      return MAINNET_TOKENS_BY_ADDRESS[price.buyToken.toLowerCase()];
    }
    return MAINNET_TOKENS_BY_ADDRESS[price.buyToken.toLowerCase()];
  };

  const { signTypedDataAsync } = useSignTypedData();
  const { data: walletClient } = useWalletClient();

  // Fetch quote data
  useEffect(() => {
    const params = {
      chainId: chainId.toString(),
      sellToken: price.sellToken,
      buyToken: price.buyToken,
      sellAmount: price.sellAmount,
      ...(taker && { taker: taker.toString() }),
      swapFeeRecipient: FEE_RECIPIENT,
      swapFeeBps: AFFILIATE_FEE.toString(),
      swapFeeToken: price.buyToken,
      tradeSurplusRecipient: FEE_RECIPIENT,
    };

    async function main() {
      const response = await fetch(
        `/api/0x/quote?${new URLSearchParams(params).toString()}`
      );
      const data = await response.json();
      setQuote(data);
    }
    main();
  }, [
    chainId,
    price.sellToken,
    price.buyToken,
    price.sellAmount,
    taker,
    setQuote,
  ]);

  const {
    data: hash,
    isPending,
    error,
    sendTransaction,
  } = useSendTransaction();

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash,
    });

  if (!quote) {
    return <div>Getting best quote...</div>;
  }

  console.log("quote", quote);

  // Helper function to format tax basis points to percentage
  const formatTax = (taxBps: string) => (parseFloat(taxBps) / 100).toFixed(2);

  return (
    <div className="p-3 mx-auto max-w-screen-sm ">
      <form>
        <div className="bg-slate-200 dark:bg-slate-800 p-4 rounded-sm mb-3">
          <div className="text-xl mb-2 text-white">You pay</div>
          <div className="flex items-center text-lg sm:text-3xl text-white">
            <Image
              alt={sellTokenInfo(chainId).symbol}
              className="h-9 w-9 mr-2 rounded-md"
              src={sellTokenInfo(chainId || 1)?.logoURI}
              width={9}
              height={9}
            />
            <span>
              {formatUnits(
                BigInt(quote.sellAmount),
                sellTokenInfo(chainId).decimals
              )}
            </span>
            <div className="ml-2">{sellTokenInfo(chainId).symbol}</div>
          </div>
        </div>

        <div className="bg-slate-200 dark:bg-slate-800 p-4 rounded-sm mb-3">
          <div className="text-xl mb-2 text-white">You receive</div>
          <div className="flex items-center text-lg sm:text-3xl text-white">
            <img
              alt={
                MAINNET_TOKENS_BY_ADDRESS[price.buyToken.toLowerCase()].symbol
              }
              className="h-9 w-9 mr-2 rounded-md"
              src={
                MAINNET_TOKENS_BY_ADDRESS[price.buyToken.toLowerCase()].logoURI
              }
            />
            <span>
              {formatUnits(
                BigInt(quote.buyAmount),
                buyTokenInfo(chainId).decimals
              )}
            </span>
            <div className="ml-2">{buyTokenInfo(chainId).symbol}</div>
          </div>
        </div>

        <div className="bg-slate-200 dark:bg-slate-800 p-4 rounded-sm mb-3">
          <div className="text-slate-400">
            {quote.fees &&
            quote.fees.integratorFee &&
            quote.fees.integratorFee.amount
              ? "Affiliate Fee: " +
                Number(
                  formatUnits(
                    BigInt(quote.fees.integratorFee.amount),
                    buyTokenInfo(chainId).decimals
                  )
                ) +
                " " +
                buyTokenInfo(chainId).symbol
              : null}
          </div>
          {/* Tax Information Display */}
          <div className="text-slate-400">
            {quote.tokenMetadata.buyToken.buyTaxBps &&
              quote.tokenMetadata.buyToken.buyTaxBps !== "0" && (
                <p>
                  {buyTokenInfo(chainId).symbol +
                    ` Buy Tax: ${formatTax(
                      quote.tokenMetadata.buyToken.buyTaxBps
                    )}%`}
                </p>
              )}
            {quote.tokenMetadata.sellToken.sellTaxBps &&
              quote.tokenMetadata.sellToken.sellTaxBps !== "0" && (
                <p>
                  {sellTokenInfo(chainId).symbol +
                    ` Sell Tax: ${formatTax(
                      quote.tokenMetadata.sellToken.sellTaxBps
                    )}%`}
                </p>
              )}
          </div>
        </div>
      </form>

      <button
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded w-full"
        disabled={isPending}
        onClick={async () => {
          console.log("submitting quote to blockchain");
          console.log("to", quote.transaction.to);
          console.log("value", quote.transaction.value);

          // On click, (1) Sign the Permit2 EIP-712 message returned from quote
          if (quote.permit2?.eip712) {
            let signature: Hex | undefined;
            try {
              signature = await signTypedDataAsync(quote.permit2.eip712);
              console.log("Signed permit2 message from quote response");
            } catch (error) {
              console.error("Error signing permit2 coupon:", error);
            }

            // (2) Append signature length and signature data to calldata

            if (signature && quote?.transaction?.data) {
              const signatureLengthInHex = numberToHex(size(signature), {
                signed: false,
                size: 32,
              });

              const transactionData = quote.transaction.data as Hex;
              const sigLengthHex = signatureLengthInHex as Hex;
              const sig = signature as Hex;

              quote.transaction.data = concat([
                transactionData,
                sigLengthHex,
                sig,
              ]);
            } else {
              throw new Error("Failed to obtain signature or transaction data");
            }
          }

          // (3) Submit the transaction with Permit2 signature

          sendTransaction({
            account: walletClient?.account.address,
            gas: quote.transaction.gas
              ? BigInt(quote?.transaction.gas)
              : undefined,
            to: quote.transaction.to,
            data: quote.transaction.data, // submit
            value: quote.transaction.value
              ? BigInt(quote.transaction.value)
              : undefined, // value is used for native tokens
            chainId: chainId,
          });
        }}
      >
        {isPending ? "Confirming..." : "Place Order"}
      </button>
      <br></br>
      <br></br>
      <br></br>
      {isConfirming && (
        <div className="text-center">Waiting for confirmation ⏳ ...</div>
      )}
      {isConfirmed && (
        <div className="text-center">
          Transaction Confirmed! 🎉{" "}
          <a href={`https://etherscan.io/tx/${hash}`}>Check Etherscan</a>
        </div>
      )}
      {error && (
        <div>Error: {(error as BaseError).shortMessage || error.message}</div>
      )}
    </div>
  );
}
