/* eslint-disable @typescript-eslint/consistent-type-imports */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { createCAIP373QuotedCommentResolver } from "../../src/resolvers/caip373-quoted-comment-resolver.ts";
import { CommentManagerABI, SUPPORTED_CHAINS } from "@ecp.eth/sdk";
import { createPublicClient, encodeFunctionData, http, toHex } from "viem";
import { anvil } from "viem/chains";
import { randomBytes } from "crypto";
import { commentByIdResolverService } from "../../src/services/comment-by-id-resolver.ts";
import { metrics } from "../../src/services/metrics.ts";

vi.mock("../../src/services/comment-by-id-resolver.ts", () => {
  return {
    commentByIdResolverService: {
      loadMany: vi.fn(),
    },
  };
});

const { commentByIdResolverService: commentByIdResolverServiceMock } =
  await vi.importMock<
    typeof import("../../src/services/comment-by-id-resolver.ts")
  >("../../src/services/comment-by-id-resolver.ts");

describe("CAIP373QuotedCommentResolver", () => {
  const resolver = createCAIP373QuotedCommentResolver({
    chains: {
      31337: {
        commentManagerAddress: SUPPORTED_CHAINS[31337].commentManagerAddress,
        channelManagerAddress: SUPPORTED_CHAINS[31337].channelManagerAddress,
        id: 31337,
        transport: http(),
        publicClient: createPublicClient({
          transport: http(),
          chain: anvil,
        }),
      },
    },
    commentByIdResolver: commentByIdResolverService,
    metrics,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resolves unknown chain to null", async () => {
    await expect(
      resolver.load({
        chainId: 1,
        commentManagerAddress: SUPPORTED_CHAINS[8453].commentManagerAddress,
        functionCallData: toHex(randomBytes(32)),
      }),
    ).resolves.toBeNull();
  });

  it("resolves incorrect comment manager address to null", async () => {
    await expect(
      resolver.load({
        chainId: 31337,
        commentManagerAddress: SUPPORTED_CHAINS[8453].commentManagerAddress,
        functionCallData: toHex(randomBytes(32)),
      }),
    ).resolves.toBeNull();
  });

  it("resolves incorrect caip373 to null", async () => {
    await expect(
      resolver.load({
        chainId: 31337,
        commentManagerAddress: SUPPORTED_CHAINS[31337].commentManagerAddress,
        functionCallData: encodeFunctionData({
          abi: CommentManagerABI,
          functionName: "deleteComment",
          args: [toHex(randomBytes(32))],
        }),
      }),
    ).resolves.toBeNull();
  });

  it("resolves not existing comment to null", async () => {
    commentByIdResolverServiceMock.loadMany.mockResolvedValueOnce([null]);

    await expect(
      resolver.load({
        chainId: 31337,
        commentManagerAddress: SUPPORTED_CHAINS[31337].commentManagerAddress,
        functionCallData: encodeFunctionData({
          abi: CommentManagerABI,
          functionName: "getComment",
          args: [toHex(randomBytes(32))],
        }),
      }),
    ).resolves.toBeNull();

    expect(commentByIdResolverServiceMock.loadMany).toHaveBeenCalledOnce();
  });

  it("resolves existing comment to a result", async () => {
    const commentId = toHex(randomBytes(32));

    commentByIdResolverServiceMock.loadMany.mockResolvedValueOnce([
      { id: commentId, chainId: 31337 } as any,
    ]);

    await expect(
      resolver.load({
        chainId: 31337,
        commentManagerAddress: SUPPORTED_CHAINS[31337].commentManagerAddress,
        functionCallData: encodeFunctionData({
          abi: CommentManagerABI,
          functionName: "getComment",
          args: [commentId],
        }),
      }),
    ).resolves.toEqual({
      commentId,
      chainId: 31337,
      commentManagerAddress: SUPPORTED_CHAINS[31337].commentManagerAddress,
    });
  });

  it("works with multiple values", async () => {
    const commentId1 = toHex(randomBytes(32));
    const commentId2 = toHex(randomBytes(32));
    const commentId3 = toHex(randomBytes(32));

    commentByIdResolverServiceMock.loadMany.mockResolvedValueOnce([
      { id: commentId1.toLowerCase(), chainId: 31337 } as any,
      null,
      { id: commentId2.toLowerCase(), chainId: 31337 } as any,
    ]);

    await expect(
      resolver.loadMany([
        {
          chainId: 31337,
          commentManagerAddress: SUPPORTED_CHAINS[31337].commentManagerAddress,
          functionCallData: encodeFunctionData({
            abi: CommentManagerABI,
            functionName: "getComment",
            args: [commentId1],
          }),
        },
        {
          chainId: 31337,
          commentManagerAddress: SUPPORTED_CHAINS[31337].commentManagerAddress,
          functionCallData: encodeFunctionData({
            abi: CommentManagerABI,
            functionName: "getComment",
            args: [commentId3],
          }),
        },
        {
          chainId: 31337,
          commentManagerAddress: SUPPORTED_CHAINS[31337].commentManagerAddress,
          functionCallData: encodeFunctionData({
            abi: CommentManagerABI,
            functionName: "getComment",
            args: [commentId2],
          }),
        },
        {
          chainId: 31337,
          commentManagerAddress: SUPPORTED_CHAINS[31337].commentManagerAddress,
          functionCallData: encodeFunctionData({
            abi: CommentManagerABI,
            functionName: "deleteComment",
            args: [toHex(randomBytes(32))],
          }),
        },
      ]),
    ).resolves.toEqual([
      {
        commentId: commentId1.toLowerCase(),
        chainId: 31337,
        commentManagerAddress: SUPPORTED_CHAINS[31337].commentManagerAddress,
      },
      null,
      {
        commentId: commentId2.toLowerCase(),
        chainId: 31337,
        commentManagerAddress: SUPPORTED_CHAINS[31337].commentManagerAddress,
      },
      null,
    ]);
  });
});
