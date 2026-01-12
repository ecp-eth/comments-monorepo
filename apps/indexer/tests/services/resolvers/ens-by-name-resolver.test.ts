import { describe, it, expect } from "vitest";
import { ENSByNameResolver } from "../../../src/services/resolvers/ens-by-name-resolver";
import { metrics } from "../../../src/services/metrics";

const resolver = new ENSByNameResolver({
  chainRpcUrl: process.env.ENS_RPC_URL ?? "https://ethereum-rpc.publicnode.com",
  metrics,
});

describe("ENSByNameResolver", () => {
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
