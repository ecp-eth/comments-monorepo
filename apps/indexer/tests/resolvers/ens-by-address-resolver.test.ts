import { describe, it, expect } from "vitest";
import { createENSByAddressResolver } from "../../src/resolvers/ens-by-address-resolver";

const resolver = createENSByAddressResolver({
  chainRpcUrl: process.env.ENS_RPC_URL ?? "https://ethereum-rpc.publicnode.com",
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
});
