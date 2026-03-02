import { z } from "zod/v3";
import { erc20Abi, formatEther, formatUnits, type Hex } from "viem";
import type { TotalFeeEstimation } from "@ecp.eth/sdk/channel-manager";
import type { PublicClient, Transport, Chain } from "viem";
import { ZERO_ADDRESS } from "@ecp.eth/sdk";

export type HookFeeAnalysis = {
  nativeEthCost: bigint;
  nativeEthCostFormatted: string;
  nativeEthCostUsd: number;
  erc20Approval?: {
    tokenAddress: Hex;
    tokenSymbol: string;
    amount: bigint;
    amountFormatted: string;
    hookAddress: Hex;
  };
  totalCostUsd: number;
  exceedsThreshold: boolean;
};

/**
 * Analyzes a hook fee estimation and determines whether the cost exceeds
 * the configured warning threshold.
 *
 * Returns a structured analysis with formatted cost strings and USD equivalents.
 */
export async function analyzeHookFee({
  fee,
  hookFeeWarningThresholdUsd,
  publicClient,
}: {
  fee: TotalFeeEstimation;
  hookFeeWarningThresholdUsd: number;
  publicClient: PublicClient<Transport, Chain, undefined>;
}): Promise<HookFeeAnalysis | null> {
  const hasHook = fee.hook && fee.hook !== ZERO_ADDRESS;
  const hasNativeCost = fee.baseToken.amount > 0n;
  const hasErc20Cost = fee.contractAsset && fee.contractAsset.amount > 0n;

  if (!hasHook || (!hasNativeCost && !hasErc20Cost)) {
    return null;
  }

  const nativeEthCostEth = parseFloat(formatEther(fee.baseToken.amount));

  const usdPerEth = await getETHPrice();
  const nativeEthCostUsd = nativeEthCostEth * usdPerEth;

  const nativeEthCostFormatted = `${formatEther(fee.baseToken.amount)} ETH`;

  let erc20Approval: HookFeeAnalysis["erc20Approval"];
  if (hasErc20Cost && fee.contractAsset) {
    let symbol = "???";
    let decimals = 18;
    try {
      const [readSymbol, readDecimals] = await Promise.all([
        publicClient.readContract({
          address: fee.contractAsset.address,
          abi: erc20Abi,
          functionName: "symbol",
          args: [],
        }),
        publicClient.readContract({
          address: fee.contractAsset.address,
          abi: erc20Abi,
          functionName: "decimals",
          args: [],
        }),
      ]);
      symbol = readSymbol || symbol;
      decimals = readDecimals ?? decimals;
    } catch {
      // best-effort metadata; keep fallback values
    }

    erc20Approval = {
      tokenAddress: fee.contractAsset.address,
      tokenSymbol: symbol,
      amount: fee.contractAsset.amount,
      amountFormatted: `${formatUnits(fee.contractAsset.amount, decimals)} ${symbol}`,
      hookAddress: fee.hook,
    };
  }

  const totalCostUsd = nativeEthCostUsd;

  const exceedsThreshold =
    totalCostUsd > hookFeeWarningThresholdUsd ||
    (!!erc20Approval && erc20Approval.amount > 0n);

  return {
    nativeEthCost: fee.baseToken.amount,
    nativeEthCostFormatted,
    nativeEthCostUsd,
    erc20Approval,
    totalCostUsd,
    exceedsThreshold,
  };
}

const coinGeckoResponseBodySchema = z.object({
  ethereum: z.object({
    usd: z.coerce.number(),
  }),
});

let getETHPricePromise: Promise<number> | undefined;
async function getETHPrice(): Promise<number> {
  if (getETHPricePromise) {
    return getETHPricePromise;
  }

  getETHPricePromise = (async () => {
    try {
      const response = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd",
      );

      if (!response.ok) {
        getETHPricePromise = undefined;
        return 0;
      }

      const data = await response.json();
      const parseResult = coinGeckoResponseBodySchema.safeParse(data);

      if (!parseResult.success) {
        getETHPricePromise = undefined;
        return 0;
      }

      return parseResult.data.ethereum.usd;
    } catch {
      getETHPricePromise = undefined;
      return 0;
    }
  })();
  return getETHPricePromise;
}
