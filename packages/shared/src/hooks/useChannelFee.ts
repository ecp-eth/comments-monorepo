import { useEffect, useState } from "react";
import { z } from "zod/v3";
import { useDebounce } from "use-debounce";
import { erc20Abi, Hex } from "viem";
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

type ChannelFeeResult = {
  fee: TotalFeeEstimation;
  usdPerEth?: Decimal;
  nativeTokenCostInEthText: string;
  nativeTokenCostInUSDText?: string;
  erc20CostText?: string;
};

export function useChannelFee(
  params: {
    channelId: bigint | string | undefined;
    address: Hex | undefined;
    content: string;
    publicClient?: PublicClient<Transport, Chain, undefined>;
    app: Hex;
    toSignificantDigits?: number;
    action: "post" | "edit";
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
    action,
  } = params;
  const targetUri = "targetUri" in params ? params.targetUri : undefined;
  const parentId = "parentId" in params ? params.parentId : undefined;
  const [debouncedContent] = useDebounce(content, 700);
  const [data, setData] = useState<ChannelFeeResult>();
  const [error, setError] = useState<unknown>(undefined);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setPending(true);
    (async () => {
      if (!publicClient || !channelId) {
        return;
      }

      let channelIdBigInt: bigint | undefined;

      try {
        channelIdBigInt = BigInt(channelId);
      } catch (error) {
        setError(error);
        return;
      }

      if (channelIdBigInt == null) {
        return;
      }

      // use a mock address if no address is provided to fetch a estimated fee
      const author = address ?? "0x0000000000000000000000000000000000000000";
      const estimationCommentData =
        createEstimateChannelPostOrEditCommentFeeData({
          channelId: channelIdBigInt,
          author,
          content: debouncedContent,
          app,
          ...(targetUri
            ? { targetUri }
            : parentId
              ? { parentId }
              : never("targetUri or parentId is required")),
        });

      const fee = await (
        action === "edit"
          ? estimateChannelEditCommentFee
          : estimateChannelPostCommentFee
      )({
        commentData: estimationCommentData,
        metadata: [],
        msgSender: author,
        readContract: publicClient.readContract,
        channelId: channelIdBigInt,
      });

      const nativeTokenCostInEth = new Decimal(
        fee.baseToken.amount.toString(),
      ).div(new Decimal(10).pow(18));

      const [usdPerEth, erc20CostText] = await Promise.all([
        getETHPrice(),
        getERC20CostText(fee, publicClient),
      ]);
      const nativeTokenCostInEthText = `${nativeTokenCostInEth.toSignificantDigits(toSignificantDigits)} ETH`;
      const nativeTokenCostInUSDText = getNativeTokenCostInUSD(
        nativeTokenCostInEth,
        usdPerEth,
      );

      return {
        fee,
        usdPerEth,
        nativeTokenCostInEthText,
        nativeTokenCostInUSDText,
        erc20CostText,
      };
    })()
      .then(setData)
      .catch(setError)
      .finally(() => {
        setPending(false);
      });
  }, [
    publicClient,
    channelId,
    address,
    debouncedContent,
    app,
    targetUri,
    parentId,
    toSignificantDigits,
  ]);

  return { data, error, pending };
}

function getNativeTokenCostInUSD(
  nativeTokenCostInEth: Decimal,
  usdPerEth: Decimal,
): string {
  const usdCost = nativeTokenCostInEth.mul(usdPerEth);
  const formattedUsdCost = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(usdCost.toNumber());

  return usdCost.gt(0) ? formattedUsdCost : "";
}

async function getERC20CostText(
  feeEstimation: TotalFeeEstimation,
  publicClient: PublicClient<Transport, Chain, undefined>,
): Promise<string | undefined> {
  const contractAsset = feeEstimation.contractAsset;

  if (!contractAsset) {
    return;
  }

  const symbol = await publicClient?.readContract({
    address: contractAsset.address,
    abi: erc20Abi,
    functionName: "symbol",
    args: [],
  });

  if (!symbol) {
    return;
  }

  return contractAsset.amount.toString() + " " + symbol;
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
