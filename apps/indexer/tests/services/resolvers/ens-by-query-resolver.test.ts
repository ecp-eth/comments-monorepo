import { describe, it, expect, vi } from "vitest";
import * as graphqlRequest from "graphql-request";
import { ENSByQueryResolver } from "../../../src/services/resolvers/ens-by-query-resolver";
import { metrics } from "../../../src/services/metrics";

const resolver = new ENSByQueryResolver({
  subgraphUrl: "https://api.alpha.ensnode.io/subgraph",
  metrics,
});

vi.mock("graphql-request", async () => {
  const graphqlRequestActual = await vi.importActual("graphql-request");
  const graphqlRequestMock = {
    request: vi.fn(
      graphqlRequestActual.request as unknown as typeof graphqlRequest.request,
    ),
    gql: graphqlRequestActual.gql,
  };

  return graphqlRequestMock;
});

describe("ENSByQueryResolver", () => {
  it(
    "should handle multiple queries in one request without problems",
    { timeout: 30_000 },
    async () => {
      const [addrList0, addrList1, addrList2] = await Promise.all([
        resolver.load("0xdAa83039ACA9a33b2e54bb2acC9f9c3A99357618"),
        resolver.load("0xC506739D39cBf1D94E2510bfcA64Cb6015F4Bb1B"),
        resolver.load("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"),
      ]);

      expect(addrList0?.[0]).toEqual({
        address: expect.stringMatching(/^0x[0-9a-fA-F]{40}$/),
        name: "df.me.eth.id",
        avatarUrl: expect.toBeOneOf([null, expect.any(String)]),
        url: expect.stringMatching(
          /^https:\/\/app\.ens\.domains\/0x[0-9a-fA-F]{40}$/,
        ),
      });

      expect(addrList1?.[0]).toEqual({
        address: expect.stringMatching(/^0x[0-9a-fA-F]{40}$/),
        name: "test.normx.eth",
        avatarUrl: expect.toBeOneOf([null, expect.any(String)]),
        url: expect.stringMatching(
          /^https:\/\/app\.ens\.domains\/0x[0-9a-fA-F]{40}$/,
        ),
      });

      expect(addrList2?.[0]).toEqual({
        address: expect.stringMatching(/^0x[0-9a-fA-F]{40}$/),
        name: "vbuterin.stateofus.eth",
        avatarUrl: expect.toBeOneOf([null, expect.any(String)]),
        url: expect.stringMatching(
          /^https:\/\/app\.ens\.domains\/0x[0-9a-fA-F]{40}$/,
        ),
      });

      // verify that the request is called exactly once with all the addresses
      expect(graphqlRequest.request).toHaveBeenCalledExactlyOnceWith(
        "https://api.alpha.ensnode.io/subgraph",
        expect.any(String),
        expect.objectContaining({
          addresses: [
            "0xdAa83039ACA9a33b2e54bb2acC9f9c3A99357618",
            "0xC506739D39cBf1D94E2510bfcA64Cb6015F4Bb1B",
            "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
          ],
        }),
      );
    },
  );
});
