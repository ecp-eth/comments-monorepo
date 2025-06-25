import nock from "nock";
import { beforeAll, beforeEach, afterAll, describe, it, expect } from "vitest";
import { createFarcasterByNameResolver } from "../../src/resolvers/farcaster-by-name-resolver";

describe("farcaster-by-name-resolver", () => {
  const resolver = createFarcasterByNameResolver({
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
      .get("/v2/farcaster/user/by_username")
      .twice()
      .query({
        username: "not_found",
      })
      .reply(404, {
        message: "Not Found",
      });

    await expect(resolver.load("not_found")).resolves.toBe(null);

    await expect(resolver.load("not_found.fcast.id")).resolves.toBe(null);
  });

  it("should return user", async () => {
    nock("https://api.neynar.com")
      .get("/v2/farcaster/user/by_username")
      .twice()
      .query({
        username: "mskr",
      })
      .reply(200, {
        user: {
          object: "user",
          custody_address: "0x78397D9D185D3a57D01213CBe3Ec1EbAC3EEc77d",
          fid: 341794,
          username: "mskr",
          display_name: "mskr",
          pfp_url: "https://i.imgur.com/DyoLsDd.jpg",
        },
      });

    const expected = {
      address: "0x78397D9D185D3a57D01213CBe3Ec1EbAC3EEc77d",
      fid: 341794,
      username: "mskr",
      fname: "mskr.fcast.id",
      pfpUrl: "https://i.imgur.com/DyoLsDd.jpg",
      displayName: "mskr",
      url: "https://farcaster.xyz/mskr",
    };

    await expect(resolver.loadMany(["mskr", "mskr.fcast.id"])).resolves.toEqual(
      [expected, expected],
    );
  });
});
