import { Hex } from "viem";
import { useCallback, useEffect, useState } from "react";
import {
  createEstimateChannelPostOrEditCommentFeeData,
  estimateChannelPostCommentFee,
  TotalFeeEstimation,
} from "@ecp.eth/sdk/channel-manager";
import { PublicClient, Transport, Chain } from "viem";

export function useChannelFee({
  channelId,
  address,
  content,

  publicClient,
  app,
  ...targetUriOrParentIdContainer
}: {
  channelId: bigint | string | undefined;
  address: Hex | undefined;
  content: string;
  publicClient?: PublicClient<Transport, Chain, undefined>;
  app: Hex;
} & (
  | {
      targetUri: string;
    }
  | {
      parentId: Hex;
    }
)) {
  const [fee, setFee] = useState<TotalFeeEstimation | null>(null);

  useEffect(() => {
    if (!publicClient || !channelId || !address) {
      return;
    }

    let channelIdBigInt: bigint | undefined;

    try {
      channelIdBigInt = BigInt(channelId);
    } catch {
      /* ignore conversion error as it means fee not rquired */
    }

    if (channelIdBigInt == null) {
      return;
    }

    const estimationCommentData = createEstimateChannelPostOrEditCommentFeeData(
      {
        channelId: channelIdBigInt,
        author: address,
        content,
        app,
        ...targetUriOrParentIdContainer,
      },
    );
    estimateChannelPostCommentFee({
      commentData: estimationCommentData,
      metadata: [],
      msgSender: address,
      readContract: publicClient.readContract,
      channelId: channelIdBigInt,
    })
      .then(setFee)
      .catch(() => {});
  }, [
    address,
    app,
    channelId,
    content,
    publicClient,
    targetUriOrParentIdContainer,
  ]);

  return {
    fee,
    ready,
  };
}
