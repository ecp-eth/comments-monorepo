import nock from "nock";
import { beforeAll, beforeEach, afterAll, describe, it, expect } from "vitest";
import { createFarcasterByAddressResolver } from "./farcaster-by-address-resolver";

describe("farcaster-by-address-resolver", () => {
  const resolver = createFarcasterByAddressResolver({
    neynarApiKey: "some-api-key",
  });

  beforeAll(() => {
    nock.disableNetConnect();
  });

  afterAll(() => {
    nock.enableNetConnect();
  });

  beforeEach(() => {
    nock.cleanAll();
    resolver.clearAll();
  });

  it("should return null if user does not exist", async () => {
    nock("https://api.neynar.com")
      .get("/v2/farcaster/user/bulk-by-address")
      .query({
        addresses: "0xc8fff6bbfc93e912b0012716cf4573c2f7a9b974",
      })
      .reply(404, {
        message: "Not Found",
      });

    await expect(
      resolver.load("0xc8fff6bbfc93e912b0012716cf4573c2f7a9b974"),
    ).resolves.toBe(null);
  });

  it("should return null and user if some of users do exist", async () => {
    nock("https://api.neynar.com")
      .get("/v2/farcaster/user/bulk-by-address")
      .query({
        addresses: [
          "0xc8fff6bbfc93e912b0012716cf4573c2f7a9b974",
          "0x78397D9D185D3a57D01213CBe3Ec1EbAC3EEc77d",
        ].join(","),
      })
      .reply(200, {
        "0x78397D9D185D3a57D01213CBe3Ec1EbAC3EEc77d": [
          {
            object: "user",
            fid: 341794,
            username: "mskr",
            display_name: "mskr",
            pfp_url: "https://i.imgur.com/DyoLsDd.jpg",
          },
        ],
      });

    await expect(
      resolver.loadMany([
        "0xc8fff6bbfc93e912b0012716cf4573c2f7a9b974",
        "0x78397D9D185D3a57D01213CBe3Ec1EbAC3EEc77d",
      ]),
    ).resolves.toEqual([null, expect.toSatisfy((v) => v != null)]);
  });
});
