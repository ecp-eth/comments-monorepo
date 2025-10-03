import * as Sentry from "@sentry/node";
import { CommentManagerABI } from "@ecp.eth/sdk";
import { isZeroHex, type Hex } from "@ecp.eth/sdk/core";
import DataLoader from "dataloader";
import type config from "../../ponder.config.ts";
import { decodeFunctionData } from "viem";

export type CAIP373QuotedCommentResolverKey = {
  functionCallData: Hex;
  chainId: number;
  commentManagerAddress: Hex;
};

export type CAIP373QuotedCommentResolverResult = {
  commentId: Hex;
  chainId: number;
  commentManagerAddress: Hex;
};

export type CAIP373QuotedCommentResolver = DataLoader<
  CAIP373QuotedCommentResolverKey,
  CAIP373QuotedCommentResolverResult | null
>;

export type CAIP373QuotedCommentResolverOptions = {
  chains: typeof config.chains;
} & Omit<
  DataLoader.Options<
    CAIP373QuotedCommentResolverKey,
    CAIP373QuotedCommentResolverResult | null,
    string
  >,
  "batchLoadFn" | "cacheKeyFn"
>;

export function createCAIP373QuotedCommentResolver({
  chains,
  ...options
}: CAIP373QuotedCommentResolverOptions): CAIP373QuotedCommentResolver {
  return new DataLoader<
    CAIP373QuotedCommentResolverKey,
    CAIP373QuotedCommentResolverResult | null,
    string
  >(
    async (keys) => {
      const commentIdsToResolveByChainId: Record<
        number,
        { commentId: Hex; result: null | CAIP373QuotedCommentResolverResult }[]
      > = {};
      const resultPointersForKeys: ({
        commentId: Hex;
        result: null | CAIP373QuotedCommentResolverResult;
      } | null)[] = keys.map((key) => {
        const chain = chains[key.chainId.toString()];

        if (
          !chain ||
          chain.channelManagerAddress.toLowerCase() !==
            key.commentManagerAddress.toLowerCase()
        ) {
          return null;
        }

        const commentId = getCommentIdFromFunctionCallData(
          key.functionCallData,
        );

        if (!commentId) {
          return null;
        }

        const toResolve = commentIdsToResolveByChainId[key.chainId] ?? [];

        const resultPointer = {
          commentId,
          result: null,
        };

        toResolve.push(resultPointer);

        commentIdsToResolveByChainId[key.chainId] = toResolve;

        return resultPointer;
      });
      const promises: Promise<void>[] = [];

      for (const [chainId, commentIdsToResolve] of Object.entries(
        commentIdsToResolveByChainId,
      )) {
        const chain = chains[chainId];

        if (!chain) {
          throw new Error(`Chain ${chainId} not found`);
        }

        const resultPromise = chain.publicClient
          .multicall({
            contracts: commentIdsToResolve.map(({ commentId }) => {
              return {
                address: chain.commentManagerAddress,
                abi: CommentManagerABI,
                functionName: "getComment",
                args: [commentId],
              } as const;
            }),
          })
          .then((results) => {
            return results.forEach((result, index) => {
              if (result.status === "failure") {
                return;
              }

              if (isZeroHex(result.result.author)) {
                return;
              }

              commentIdsToResolve[index]!.result = {
                chainId: Number(chainId),
                commentId: commentIdsToResolve[index]!.commentId,
                commentManagerAddress: chain.commentManagerAddress,
              };
            });
          });

        promises.push(resultPromise);
      }

      return resultPointersForKeys.map(
        (resultPointer) => resultPointer?.result ?? null,
      );
    },
    {
      ...options,
      cacheKeyFn(key) {
        return JSON.stringify({
          functionCallData: key.functionCallData.toLowerCase(),
          chainId: key.chainId,
          commentManagerAddress: key.commentManagerAddress.toLowerCase(),
        });
      },
    },
  );
}

function getCommentIdFromFunctionCallData(functionCallData: Hex): null | Hex {
  try {
    const decoded = decodeFunctionData({
      abi: CommentManagerABI,
      data: functionCallData,
    });

    if (decoded.functionName !== "getComment") {
      return null;
    }

    return decoded.args[0];
  } catch (e) {
    Sentry.captureMessage("Failed to get comment id from function call data", {
      level: "warning",
      extra: {
        functionCallData,
        error: e,
      },
    });

    return null;
  }
}
