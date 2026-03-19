import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  return {
    ensByAddressLoad: vi.fn(),
    farcasterByAddressLoad: vi.fn(),
    erc20ByAddressLoad: vi.fn(),
    ensByNameLoad: vi.fn(),
    farcasterByNameLoad: vi.fn(),
    ensByQueryLoad: vi.fn(),
  };
});

vi.mock("../../../src/services/ens-by-address-resolver", () => ({
  ensByAddressResolverService: { load: mocks.ensByAddressLoad },
}));

vi.mock("../../../src/services/farcaster-by-address-resolver", () => ({
  farcasterByAddressResolverService: { load: mocks.farcasterByAddressLoad },
}));

vi.mock("../../../src/services/erc20-by-address-resolver", () => ({
  erc20ByAddressResolverService: { load: mocks.erc20ByAddressLoad },
}));

vi.mock("../../../src/services/ens-by-name-resolver", () => ({
  ensByNameResolverService: { load: mocks.ensByNameLoad },
}));

vi.mock("../../../src/services/farcaster-by-name-resolver", () => ({
  farcasterByNameResolverService: { load: mocks.farcasterByNameLoad },
}));

vi.mock("../../../src/services/ens-by-query-resolver", () => ({
  ensByQueryResolverService: { load: mocks.ensByQueryLoad },
}));

import { getAutocompleteHandler } from "../../../src/api/autocomplete/handlers/get";

describe("getAutocompleteHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resolves non-.eth ens names via exact ENS lookup", async () => {
    mocks.ensByNameLoad.mockResolvedValue({
      type: "ens",
      name: "nick.chat.fun",
      address: "0x1111111111111111111111111111111111111111",
      avatarUrl: null,
      url: "https://app.ens.domains/0x1111111111111111111111111111111111111111",
    });

    const result = await getAutocompleteHandler({
      char: "@",
      query: "nick.chat.fun",
    });

    expect(mocks.ensByNameLoad).toHaveBeenCalledWith("nick.chat.fun");
    expect(mocks.ensByQueryLoad).not.toHaveBeenCalled();
    expect(result).toEqual({
      results: [
        {
          type: "ens",
          name: "nick.chat.fun",
          address: "0x1111111111111111111111111111111111111111",
          avatarUrl: null,
          url: "https://app.ens.domains/0x1111111111111111111111111111111111111111",
          value: "0x1111111111111111111111111111111111111111",
        },
      ],
    });
  });

  it("prioritizes farcaster lookup for fcast names", async () => {
    mocks.farcasterByNameLoad.mockResolvedValue({
      address: "0x2222222222222222222222222222222222222222",
      fid: 123,
      fname: "mskr.fcast.id",
      displayName: "mskr",
      username: "mskr",
      pfpUrl: null,
      url: "https://farcaster.xyz/mskr",
    });

    const result = await getAutocompleteHandler({
      char: "@",
      query: "mskr.fcast.id",
    });

    expect(mocks.farcasterByNameLoad).toHaveBeenCalledWith("mskr.fcast.id");
    expect(mocks.ensByNameLoad).not.toHaveBeenCalled();
    expect(result).toEqual({
      results: [
        {
          type: "farcaster",
          address: "0x2222222222222222222222222222222222222222",
          fid: 123,
          fname: "mskr.fcast.id",
          displayName: "mskr",
          username: "mskr",
          pfpUrl: null,
          url: "https://farcaster.xyz/mskr",
          value: "0x2222222222222222222222222222222222222222",
        },
      ],
    });
  });
});
