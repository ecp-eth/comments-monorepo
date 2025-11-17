import { z } from "zod/v3";
import { useDebounce } from "use-debounce";
import { erc20Abi, Hex } from "viem";
import { useEffect, useState } from "react";
import { Decimal } from "decimal.js";
import {
  createEstimateChannelPostOrEditCommentFeeData,
  estimateChannelEditCommentFee,
  estimateChannelPostCommentFee,
  TotalFeeEstimation,
} from "@ecp.eth/sdk/channel-manager";
import { PublicClient, Transport, Chain } from "viem";
import { never } from "../helpers";
import { EMPTY_PARENT_ID } from "@ecp.eth/sdk";

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
  const [nativeTokenCostInEthText, setNativeTokenCostInEthText] =
    useState<string>();
  const [nativeTokenCostInUSDText, setNativeTokenCostInUSDText] =
    useState<string>();
  const [erc20CostText, setERC20CostText] = useState<string>();
  const [usdPerEth, setUsdPerEth] = useState<Decimal>(new Decimal(0));

  const reset = () => {
    setFee(undefined);
    setNativeTokenCostInEthText(undefined);
    setERC20CostText(undefined);
    setUsdPerEth(new Decimal(0));
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

    (parentId !== EMPTY_PARENT_ID && parentId != null
      ? estimateChannelEditCommentFee
      : estimateChannelPostCommentFee)({
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

    const nativeTokenCostInEth = new Decimal(
      fee.baseToken.amount.toString(),
    ).div(new Decimal(10).pow(18));

    setNativeTokenCostInEthText(
      `${nativeTokenCostInEth.toSignificantDigits(toSignificantDigits)} ETH`,
    );

    void getNativeTokenCostInUSD(nativeTokenCostInEth).then(
      setNativeTokenCostInUSDText,
    );

    void getETHPrice().then(setUsdPerEth);

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
          setERC20CostText(contractAsset.amount.toString() + " " + symbol);
        });
    }
  }, [fee, publicClient, toSignificantDigits]);

  return {
    fee,
    nativeTokenCostInEthText,
    nativeTokenCostInUSDText,
    erc20CostText,
    usdPerEth,
  };
}

async function getNativeTokenCostInUSD(
  nativeTokenCostInEth: Decimal,
): Promise<string> {
  const usdPerEth = await getETHPrice();
  const usdCost = nativeTokenCostInEth.mul(usdPerEth);
  const formattedUsdCost = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(usdCost.toNumber());

  return usdCost.gt(0) ? formattedUsdCost : "";
}

const coinGeckoResponseBodySchema = z.object({
  ethereum: z.object({
    usd: z.coerce.number(),
  }),
});

let getETHPricePromise: Promise<Decimal> | undefined;
async function getETHPrice(): Promise<Decimal> {
  if (getETHPricePromise) {
    return getETHPricePromise;
  }

  getETHPricePromise = (async () => {
    try {
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

      return new Decimal(parseResult.data.ethereum.usd);
    } catch {
      return new Decimal(0);
    }
  })();
  return getETHPricePromise;
}
