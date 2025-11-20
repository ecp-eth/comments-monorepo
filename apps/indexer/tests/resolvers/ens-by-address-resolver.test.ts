import { describe, it, expect } from "vitest";
import { createENSByAddressResolver } from "../../src/resolvers/ens-by-address-resolver";
import { createENSByQueryResolver } from "../../src/resolvers";
import { metrics } from "../../src/services/metrics";

const resolver = createENSByAddressResolver({
  chainRpcUrl: process.env.ENS_RPC_URL ?? "https://ethereum-rpc.publicnode.com",
  ensByQueryResolver: createENSByQueryResolver({
    subgraphUrl: "https://api.alpha.ensnode.io/subgraph",
  }),
  metrics,
});

describe("ENSByAddressResolver", () => {
  it("should resolve address to ens name", async () => {
    const result = await resolver.load(
      "0xdAa83039ACA9a33b2e54bb2acC9f9c3A99357618",
    );

    expect(result).toEqual({
      address: expect.stringMatching(/^0x[0-9a-fA-F]{40}$/),
      name: "furlong.eth",
      avatarUrl: expect.toBeOneOf([null, expect.any(String)]),
      url: expect.stringMatching(
        /^https:\/\/app\.ens\.domains\/0x[0-9a-fA-F]{40}$/,
      ),
    });
  });

  it.skip("should resolve address to base name", async () => {
    const result = await resolver.load(
      "0x6c2640459665291b19374bed498e065436f8e144",
    );

    expect(result).toEqual({
      address: expect.stringMatching(/^0x[0-9a-fA-F]{40}$/),
      name: "furlong.base.eth",
      avatarUrl: expect.toBeOneOf([null, expect.any(String)]),
      url: expect.stringMatching(
        /^https:\/\/app\.ens\.domains\/0x[0-9a-fA-F]{40}$/,
      ),
    });
  });

  it(
    "should handle multiple queries without problems",
    { timeout: 30_000 },
    async () => {
      const [
        byAddr0,
        byAddr1,
        byAddr2,
        //  byAddr3,
        //  byAddr4
      ] = await Promise.all([
        resolver.load("0xdAa83039ACA9a33b2e54bb2acC9f9c3A99357618"),
        resolver.load("0xC506739D39cBf1D94E2510bfcA64Cb6015F4Bb1B"),
        resolver.load("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"),
        // basename on ensnode graphql is broken and ens on subgraph is partial broken, so commenting out for now
        // resolver.load("0x6c2640459665291b19374bed498e065436f8e144"),
        // resolver.load("0x58f7755998Bbb778175D3361eD2437ABD9e5aBB5"),
      ]);

      expect(byAddr0).toEqual({
        address: expect.stringMatching(/^0x[0-9a-fA-F]{40}$/),
        name: "furlong.eth",
        avatarUrl: expect.toBeOneOf([null, expect.any(String)]),
        url: expect.stringMatching(
          /^https:\/\/app\.ens\.domains\/0x[0-9a-fA-F]{40}$/,
        ),
      });

      expect(byAddr1).toEqual({
        address: expect.stringMatching(/^0x[0-9a-fA-F]{40}$/),
        name: "test.normx.eth",
        avatarUrl: expect.toBeOneOf([null, expect.any(String)]),
        url: expect.stringMatching(
          /^https:\/\/app\.ens\.domains\/0x[0-9a-fA-F]{40}$/,
        ),
      });

      expect(byAddr2).toEqual({
        address: expect.stringMatching(/^0x[0-9a-fA-F]{40}$/),
        name: "vitalik.eth",
        avatarUrl: expect.toBeOneOf([null, expect.any(String)]),
        url: expect.stringMatching(
          /^https:\/\/app\.ens\.domains\/0x[0-9a-fA-F]{40}$/,
        ),
      });

      // basename on ensnode graphql is broken and ens on subgraph is partial broken, so commenting out for now

      // expect(byAddr3).toEqual({
      //   address: expect.stringMatching(/^0x[0-9a-fA-F]{40}$/),
      //   name: "furlong.base.eth",
      //   avatarUrl: expect.toBeOneOf([null, expect.any(String)]),
      //   url: expect.stringMatching(
      //     /^https:\/\/app\.ens\.domains\/0x[0-9a-fA-F]{40}$/,
      //   ),
      // });

      // expect(byAddr4).toEqual({
      //   address: expect.stringMatching(/^0x[0-9a-fA-F]{40}$/),
      //   name: "emojidate.base.eth",
      //   avatarUrl: expect.toBeOneOf([null, expect.any(String)]),
      //   url: expect.stringMatching(
      //     /^https:\/\/app\.ens\.domains\/0x[0-9a-fA-F]{40}$/,
      //   ),
      // });
    },
  );
});
