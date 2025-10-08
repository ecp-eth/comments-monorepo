import * as Sentry from "@sentry/node";
import { CommentManagerABI } from "@ecp.eth/sdk";
import { type Hex } from "@ecp.eth/sdk/core";
import DataLoader from "dataloader";
import { decodeFunctionData } from "viem";
import type config from "../../ponder.config.ts";
import { sql } from "drizzle-orm";
import { isSameHex } from "@ecp.eth/shared/helpers";
import type { CommentByIdResolver } from "./comment-by-id-resolver.ts";

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
  commentByIdResolver: CommentByIdResolver;
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
  commentByIdResolver,
  ...options
}: CAIP373QuotedCommentResolverOptions): CAIP373QuotedCommentResolver {
  return new DataLoader<
    CAIP373QuotedCommentResolverKey,
    CAIP373QuotedCommentResolverResult | null,
    string
  >(
    async (keys) => {
      const resultPointers: Record<
        string,
        {
          commentId: Hex;
          chainId: number;
          commentManagerAddress: Hex;
          result: null | CAIP373QuotedCommentResolverResult;
        }
      > = {};
      const keysToResults: {
        result: null | CAIP373QuotedCommentResolverResult;
      }[] = [];

      for (const key of keys) {
        const chain = chains[key.chainId.toString()];

        if (
          !chain ||
          !isSameHex(chain.commentManagerAddress, key.commentManagerAddress)
        ) {
          keysToResults.push({ result: null });
          continue;
        }

        const commentId = getCommentIdFromFunctionCallData(
          key.functionCallData,
        );

        if (!commentId) {
          keysToResults.push({ result: null });
          continue;
        }

        const lowerCaseCommentId = commentId.toLowerCase();

        resultPointers[`${lowerCaseCommentId}-${key.chainId}`] = {
          commentId: lowerCaseCommentId as Hex,
          chainId: key.chainId,
          commentManagerAddress: chain.commentManagerAddress,
          result: null,
        };

        keysToResults.push(
          resultPointers[`${lowerCaseCommentId}-${key.chainId}`]!,
        );
      }

      const resultPointerTuples = Object.entries(resultPointers).map(
        ([, value]) => sql`(${value.commentId}, ${value.chainId})`,
      );

      if (resultPointerTuples.length > 0) {
        const comments = await commentByIdResolver.loadMany(
          Object.entries(resultPointers).map(([, value]) => ({
            id: value.commentId,
            chainId: value.chainId,
          })),
        );

        for (const comment of comments) {
          if (comment instanceof Error || !comment) {
            continue;
          }

          const resultPointer =
            resultPointers[`${comment.id}-${comment.chainId}`];

          if (resultPointer) {
            // this updates the pointer so it is immediately available in keysToResults as well
            resultPointer.result = {
              commentId: comment.id,
              chainId: comment.chainId,
              commentManagerAddress: resultPointer.commentManagerAddress,
            };
          }
        }
      }

      return keysToResults.map((key) => key.result);
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
