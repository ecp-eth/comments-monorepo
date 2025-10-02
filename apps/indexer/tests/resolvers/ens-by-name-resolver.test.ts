import { describe, it, expect } from "vitest";
import { createENSByNameResolver } from "../../src/resolvers/ens-by-name-resolver";

const resolver = createENSByNameResolver({
  chainRpcUrl: process.env.ENS_RPC_URL ?? "https://ethereum-rpc.publicnode.com",
});

describe("ENSByNameResolver", () => {
  it(
    "should resolve ens name",
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
    {
      retry: 3,
      timeout: 10000,
    },
  );

  it(
    "should resolve base ens name",
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
    {
      retry: 3,
      timeout: 10000,
    },
  );
});
