import { useEffect, useState } from "react";
import { z } from "zod/v3";
import { useDebounce } from "use-debounce";
import { erc20Abi, formatUnits, Hex } from "viem";
import { Decimal } from "decimal.js";
import {
  createEstimateChannelPostOrEditCommentFeeData,
  estimateChannelEditCommentFee,
  estimateChannelPostCommentFee,
  TotalFeeEstimation,
} from "@ecp.eth/sdk/channel-manager";
import { PublicClient, Transport, Chain } from "viem";
import { never } from "../helpers";
import { usePublicClient } from "wagmi";

type ChannelFeeData = {
  fee: TotalFeeEstimation;
  usdPerEth?: Decimal;
  nativeTokenCostInEthText: string;
  nativeTokenCostInUSDText?: string;
  erc20CostText?: string;
};

type ChannelFeeResult =
  | {
      data: ChannelFeeData | undefined;
      error: undefined;
      pending: false;
    }
  | {
      data: undefined;
      error: unknown;
      pending: false;
    }
  | {
      data: undefined;
      error: undefined;
      pending: true;
    };

export function useChannelFee(
  params: {
    action: "post" | "edit";
    channelId: bigint | string | undefined;
    address: Hex | undefined;
    content: string;
    app: Hex;
    toSignificantDigits?: number;
    channelManagerAddress?: Hex;
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
    app,
    toSignificantDigits = 2,
    action,
    channelManagerAddress,
  } = params;
  const targetUri = "targetUri" in params ? params.targetUri : undefined;
  const parentId = "parentId" in params ? params.parentId : undefined;
  const [debouncedContent] = useDebounce(content, 700);
  const [result, setResult] = useState<ChannelFeeResult>({
    data: undefined,
    error: undefined,
    pending: false,
  });
  const publicClient = usePublicClient();

  useEffect(() => {
    setResult({
      data: undefined,
      error: undefined,
      pending: true,
    });

    (async () => {
      if (!publicClient || !channelId) {
        return;
      }

      const channelIdBigInt = BigInt(channelId);
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
        channelManagerAddress,
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
      .then((newResult) => {
        setResult({
          data: newResult,
          error: undefined,
          pending: false,
        });
      })
      .catch((error) => {
        setResult({
          data: undefined,
          error,
          pending: false,
        });
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
    action,
    channelManagerAddress,
  ]);

  return result;
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

  const [symbol, decimals] = await Promise.all([
    publicClient.readContract({
      address: contractAsset.address,
      abi: erc20Abi,
      functionName: "symbol",
      args: [],
    }),
    publicClient.readContract({
      address: contractAsset.address,
      abi: erc20Abi,
      functionName: "decimals",
      args: [],
    }),
  ]);

  if (!symbol || !decimals) {
    return;
  }

  return formatUnits(contractAsset.amount, decimals) + " " + symbol;
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
