import { describe, it, expect } from "vitest";
import {
  ENSByNameResolver,
  isEnsName,
} from "../../../src/services/resolvers/ens-by-name-resolver";
import { metrics } from "../../../src/services/metrics";

const resolver = new ENSByNameResolver({
  chainRpcUrl: process.env.ENS_RPC_URL ?? "https://ethereum-rpc.publicnode.com",
  metrics,
});

describe("ENSByNameResolver", () => {
  describe("isEnsName", () => {
    it("returns true for valid ens names", () => {
      expect(isEnsName("furlong.eth")).toBe(true);
      expect(isEnsName("alice.chat.fun")).toBe(true);
      expect(isEnsName("test.normx.eth")).toBe(true);
    });

    it("returns false for invalid names", () => {
      expect(isEnsName("invalid")).toBe(false);
      expect(isEnsName("not_valid.chat.fun")).toBe(false);
      expect(isEnsName(".chat.fun")).toBe(false);
    });
  });

  it(
    "should resolve ens name",
    {
      retry: 3,
      timeout: 10000,
    },
    async () => {
      const result = await resolver.load("furlong.eth");

      expect(result).toEqual({
        address: expect.stringMatching(/^0x[0-9a-fA-F]{40}$/),
        name: "furlong.eth",
        avatarUrl: expect.toBeOneOf([null, expect.any(String)]),
        url: expect.stringMatching(
          /^https:\/\/app\.ens\.domains\/0x[0-9a-fA-F]{40}$/,
        ),
      });
    },
  );

  // TODO: investigate and fix this
  it.skip(
    "should resolve base/id ens name",
    {
      retry: 3,
      timeout: 10000,
    },
    async () => {
      const result = await resolver.load("davidf.base.eth");

      expect(result).toEqual({
        address: expect.stringMatching(/^0x[0-9a-fA-F]{40}$/),
        name: "davidf.base.eth",
        avatarUrl: expect.toBeOneOf([null, expect.any(String)]),
        url: expect.stringMatching(
          /^https:\/\/app\.ens\.domains\/0x[0-9a-fA-F]{40}$/,
        ),
      });
    },
  );
});
