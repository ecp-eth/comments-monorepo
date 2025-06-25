import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import nock from "nock";
import { createERC20ByAddressResolver } from "../../src/resolvers/erc20-by-address-resolver";

describe("ERC20ByAddressResolver", () => {
  const resolver = createERC20ByAddressResolver({
    simApiKey: "test",
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

  it("should return null if the token info is not found", async () => {
    nock("https://api.sim.dune.com")
      .get("/v1/evm/token-info/0x1f9840a85d5af5bf1d1762f925bdaddc4201f984")
      .query({
        chain_ids: "all",
      })
      .reply(200, {
        contract_address: "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984",
        tokens: [
          {
            chain_id: 1,
            chain: "ethereum",
            pool_size: 0,
            total_supply: "0",
            decimals: 0,
          },
          {
            chain_id: 10,
            chain: "optimism",
            pool_size: 0,
            total_supply: "0",
            decimals: 0,
          },
        ],
      });

    await expect(
      resolver.load("0x1f9840a85d5af5bf1d1762f925bdaddc4201f984"),
    ).resolves.toBe(null);
  });

  it("should return a token with all chains where it is available", async () => {
    nock("https://api.sim.dune.com")
      .get("/v1/evm/token-info/0x43a8cab15d06d3a5fe5854d714c37e7e9246f170")
      .query({
        chain_ids: "all",
      })
      .reply(200, {
        contract_address: "0x43a8cab15d06d3a5fe5854d714c37e7e9246f170",
        tokens: [
          {
            chain_id: 1,
            chain: "ethereum",
            pool_size: 0,
            total_supply: "0",
            decimals: 0,
          },
          {
            chain_id: 250,
            chain: "fantom",
            price_usd: 0.02343367809378654,
            pool_size: 5100.310634115417,
            total_supply: "1255890859758333153515180",
            fully_diluted_value: 29430.142128505595,
            symbol: "ORBS",
            name: "Orbs",
            decimals: 18,
            logo: "https://api.dune.com/api/echo/beta/token/logo/250/0x43a8cab15d06d3a5fe5854d714c37e7e9246f170",
          },
          {
            chain_id: 252,
            chain: "fraxtal",
            pool_size: 0,
            total_supply: "0",
            decimals: 0,
          },
          {
            chain_id: 1380012617,
            chain: "rari",
            pool_size: 0,
            total_supply: "0",
            decimals: 0,
          },
          {
            chain_id: 56,
            chain: "bnb",
            price_usd: 0.023662141004172358,
            pool_size: 120490.90144618151,
            total_supply: "15249993136695177542174109",
            fully_diluted_value: 360847.487913142,
            symbol: "ORBS",
            name: "Orbs",
            decimals: 18,
            logo: "https://api.dune.com/api/echo/beta/token/logo/56/0x43a8cab15d06d3a5fe5854d714c37e7e9246f170",
          },
        ],
      });

    await expect(
      resolver.load("0x43a8cab15d06d3a5fe5854d714c37e7e9246f170"),
    ).resolves.toStrictEqual({
      address: "0x43a8cab15d06d3a5fe5854d714c37e7e9246f170",
      symbol: "ORBS",
      name: "Orbs",
      decimals: 18,
      logoURI:
        "https://api.dune.com/api/echo/beta/token/logo/250/0x43a8cab15d06d3a5fe5854d714c37e7e9246f170",
      chains: [
        {
          caip: "eip155:250/erc20:0x43a8cab15d06d3a5fe5854d714c37e7e9246f170",
          chainId: 250,
        },
        {
          caip: "eip155:56/erc20:0x43a8cab15d06d3a5fe5854d714c37e7e9246f170",
          chainId: 56,
        },
      ],
    });
  });

  it("should throw if api does not respond with 200 status code", async () => {
    nock("https://api.sim.dune.com")
      .get("/v1/evm/token-info/0x43a8cab15d06d3a5fe5854d714c37e7e9246f170")
      .query({
        chain_ids: "all",
      })
      .reply(500, {
        message: "Internal Server Error",
      });

    await expect(
      resolver.load("0x43a8cab15d06d3a5fe5854d714c37e7e9246f170"),
    ).rejects.toThrow(
      "Failed to fetch token info for 0x43a8cab15d06d3a5fe5854d714c37e7e9246f170",
    );
  });
});
