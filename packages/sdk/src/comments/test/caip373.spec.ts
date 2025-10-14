import { describe, it, expect } from "vitest";
import {
  decodeQuotedCommentFromCaip373,
  encodeQuotedCommentFromCaip373,
} from "../caip373.js";
import { randomBytes } from "node:crypto";
import { encodeFunctionData, toHex, type Hex } from "viem";
import { SUPPORTED_CHAINS } from "../../constants.js";
import { CommentManagerABI } from "../../abis.js";

describe("caip373", () => {
  describe("encodeQuotedCommentFromCaip373", () => {
    it("should encode a quoted comment from a CAIP-373", () => {
      const caip373 = encodeQuotedCommentFromCaip373({
        chainId: 31337,
        commentId: toHex(randomBytes(32)),
      });

      expect(caip373).toMatch(
        /^eip155:31337:0x[a-fA-F0-9]{40}:call:0x[a-fA-F0-9]+(:[0-9]+)?$/,
      );
    });

    it("should encode a quoted comment from a CAIP-373 with block number", () => {
      const caip373 = encodeQuotedCommentFromCaip373({
        chainId: 31337,
        commentId: toHex(randomBytes(32)),
        blockNumber: 100,
      });

      expect(caip373).toMatch(
        /^eip155:31337:0x[a-fA-F0-9]{40}:call:0x[a-fA-F0-9]+:100$/,
      );
    });

    it("should throw an error if the chain id is not supported", () => {
      expect(() =>
        encodeQuotedCommentFromCaip373({
          chainId: 999,
          commentId: toHex(randomBytes(32)),
        }),
      ).toThrow("Unsupported chain: 999");
    });

    it("should throw an error if the comment id is not a valid hex string", () => {
      expect(() =>
        encodeQuotedCommentFromCaip373({
          chainId: 31337,
          commentId: "invalid" as unknown as Hex,
        }),
      ).toThrow("Invalid comment id: invalid");
    });
  });

  describe("decodeQuotedCommentFromCaip373", () => {
    it("should decode a quoted comment from a CAIP-373", () => {
      const commentId = toHex(randomBytes(32));
      const caip373 = encodeQuotedCommentFromCaip373({
        chainId: 31337,
        commentId,
      });
      const decoded = decodeQuotedCommentFromCaip373(caip373);

      expect(decoded).toEqual({
        commentId,
        chainId: 31337,
        commentManagerAddress: SUPPORTED_CHAINS[31337].commentManagerAddress,
        blockNumber: undefined,
      });
    });

    it("should decode a quoted comment from a CAIP-373 with block number", () => {
      const commentId = toHex(randomBytes(32));
      const caip373 = encodeQuotedCommentFromCaip373({
        chainId: 31337,
        commentId,
        blockNumber: 100,
      });
      const decoded = decodeQuotedCommentFromCaip373(caip373);

      expect(decoded).toEqual({
        commentId,
        chainId: 31337,
        commentManagerAddress: SUPPORTED_CHAINS[31337].commentManagerAddress,
        blockNumber: 100,
      });
    });

    it("should throw an error if the caip373 is not a valid quoted comment", () => {
      expect(() => decodeQuotedCommentFromCaip373("invalid")).toThrow(
        "Malformed CAIP-373: invalid",
      );
    });

    it("should throw an error if the chain id is not supported", () => {
      expect(() =>
        decodeQuotedCommentFromCaip373(
          `eip155:999:0x${"0".repeat(40)}:call:0x${"0".repeat(40)}`,
        ),
      ).toThrow("Unsupported chain: 999");
    });

    it("should throw an error if the comment manager address is not valid", () => {
      expect(() =>
        decodeQuotedCommentFromCaip373(
          `eip155:31337:0x${"0".repeat(40)}:call:0x${"0".repeat(40)}`,
        ),
      ).toThrow(`Invalid comment manager address: 0x${"0".repeat(40)}`);
    });

    it("should throw an error if the function call data is not valid", () => {
      const functionCallData = encodeFunctionData({
        abi: CommentManagerABI,
        functionName: "deleteComment",
        args: [toHex(randomBytes(32))],
      });

      expect(() =>
        decodeQuotedCommentFromCaip373(
          `eip155:31337:${SUPPORTED_CHAINS[31337].commentManagerAddress}:call:${functionCallData}`,
        ),
      ).toThrow(`Invalid function call data: ${functionCallData}`);
    });
  });
});
