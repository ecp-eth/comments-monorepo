import { z } from "zod/v3";
import { useDebounce } from "use-debounce";
import { erc20Abi, Hex } from "viem";
import { useEffect, useState } from "react";
import { Decimal } from "decimal.js";
import {
  createEstimateChannelPostOrEditCommentFeeData,
  estimateChannelPostCommentFee,
  TotalFeeEstimation,
} from "@ecp.eth/sdk/channel-manager";
import { PublicClient, Transport, Chain } from "viem";
import { never } from "../helpers";

export function useChannelFee(
  params: {
    channelId: bigint | string | undefined;
    address: Hex | undefined;
    content: string;
    publicClient?: PublicClient<Transport, Chain, undefined>;
    app: Hex;
    toSignificantDigits?: number;
  } & (
    | {
        targetUri: string;
      }
    | {
        parentId: Hex;
      }
  ),
) {
  const {
    channelId,
    address,
    content,
    publicClient,
    app,
    toSignificantDigits = 2,
  } = params;
  const targetUri = "targetUri" in params ? params.targetUri : undefined;
  const parentId = "parentId" in params ? params.parentId : undefined;
  const [fee, setFee] = useState<TotalFeeEstimation>();
  const [debouncedContent] = useDebounce(content, 700);
  const [nativeTokenFeeText, setNativeTokenFeeText] = useState<string>();
  const [erc20TokenFeeText, setErc20TokenFeeText] = useState<string>();

  const reset = () => {
    setFee(undefined);
    setNativeTokenFeeText(undefined);
    setErc20TokenFeeText(undefined);
  };

  useEffect(() => {
    if (!publicClient || !channelId) {
      reset();
      return;
    }

    let channelIdBigInt: bigint | undefined;

    try {
      channelIdBigInt = BigInt(channelId);
    } catch {
      /* ignore conversion error as it means fee not rquired */
    }

    if (channelIdBigInt == null) {
      reset();
      return;
    }

    // use a mock address if no address is provided to fetch a estimated fee
    const author = address ?? "0x0000000000000000000000000000000000000000";

    const estimationCommentData = createEstimateChannelPostOrEditCommentFeeData(
      {
        channelId: channelIdBigInt,
        author,
        content: debouncedContent,
        app,
        ...(targetUri
          ? { targetUri }
          : parentId
            ? { parentId }
            : never("targetUri or parentId is required")),
      },
    );

    estimateChannelPostCommentFee({
      commentData: estimationCommentData,
      metadata: [],
      msgSender: author,
      readContract: publicClient.readContract,
      channelId: channelIdBigInt,
    })
      .then(setFee)
      .catch(() => {});
  }, [
    address,
    app,
    channelId,
    debouncedContent,
    publicClient,
    parentId,
    targetUri,
  ]);

  useEffect(() => {
    if (!fee) {
      return;
    }

    void getNativeTokenCost(fee, toSignificantDigits).then(
      setNativeTokenFeeText,
    );

    const contractAsset = fee.contractAsset;

    if (contractAsset) {
      void publicClient
        ?.readContract({
          address: contractAsset.address,
          abi: erc20Abi,
          functionName: "symbol",
          args: [],
        })
        .then((symbol) => {
          if (!symbol) {
            return;
          }
          setErc20TokenFeeText(contractAsset.amount.toString() + " " + symbol);
        });
    }
  }, [fee, publicClient, toSignificantDigits]);

  return {
    fee,
    nativeTokenFeeText,
    erc20TokenFeeText,
  };
}

async function getNativeTokenCost(
  fee: TotalFeeEstimation,
  toSignificantDigits: number,
): Promise<string> {
  const nativeTokenCost = new Decimal(fee.baseToken.amount.toString()).div(
    new Decimal(10).pow(18),
  );

  const usdPerEth = await getETHPrice();
  const usdCost = nativeTokenCost.mul(usdPerEth);
  const formattedUsdCost = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(usdCost.toNumber());

  return (
    `${nativeTokenCost.toSignificantDigits(toSignificantDigits)} ETH` +
    (usdCost.gt(0) ? ` (${formattedUsdCost})` : "")
  );
}

const coinGeckoResponseBodySchema = z.object({
  ethereum: z.object({
    usd: z.coerce.number(),
  }),
});

let cachedETHPrice: Decimal | undefined;
async function getETHPrice(): Promise<Decimal> {
  if (cachedETHPrice) {
    return cachedETHPrice;
  }

  const response = await fetch(
    "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd",
  );

  if (!response.ok) {
    return new Decimal(0);
  }

  const data = await response.json();
  const parseResult = coinGeckoResponseBodySchema.safeParse(data);

  if (!parseResult.success) {
    return new Decimal(0);
  }

  cachedETHPrice = new Decimal(parseResult.data.ethereum.usd);
  return cachedETHPrice;
}
