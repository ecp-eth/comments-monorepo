import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  resolveCommentReferences,
  type ResolveCommentReferencesOptions,
} from "../../src/lib/resolve-comment-references";
import DataLoader from "dataloader";
import type {
  ENSByNameResolver,
  ENSByAddressResolver,
  ERC20ByTickerResolver,
  FarcasterByAddressResolver,
  ERC20ByAddressResolver,
  URLResolver,
  FarcasterByNameResolver,
} from "../../src/resolvers";
import { type Hex } from "viem";
import { type IPFSResolver } from "../../src/resolvers/ipfs-resolver";

const ensByNameResolver: ENSByNameResolver = new DataLoader(async (keys) =>
  keys.map(() => null),
) as unknown as ENSByNameResolver;
const ensByAddressResolver: ENSByAddressResolver = new DataLoader(
  async (keys) => keys.map(() => null),
) as unknown as ENSByAddressResolver;
const farcasterByAddressResolver: FarcasterByAddressResolver = new DataLoader(
  async (keys) => keys.map(() => null),
) as unknown as FarcasterByAddressResolver;
const farcasterByNameResolver: FarcasterByNameResolver = new DataLoader(
  async (keys) => keys.map(() => null),
) as unknown as FarcasterByNameResolver;
const erc20ByTickerResolver: ERC20ByTickerResolver = new DataLoader(
  async (keys) => keys.map(() => null),
) as unknown as ERC20ByTickerResolver;
const erc20ByAddressResolver: ERC20ByAddressResolver = new DataLoader(
  async (keys) => keys.map(() => null),
) as unknown as ERC20ByAddressResolver;
const urlResolver: URLResolver = new DataLoader(async (keys) =>
  keys.map(() => null),
) as unknown as URLResolver;
const ipfsResolver: IPFSResolver = new DataLoader(async (keys) =>
  keys.map(() => null),
) as unknown as IPFSResolver;

const fetchMock = vi.spyOn(global, "fetch");

const resolveEnsByName = vi.spyOn(ensByNameResolver, "load");
const resolveEnsByAddress = vi.spyOn(ensByAddressResolver, "load");
const resolveFarcasterByAddress = vi.spyOn(farcasterByAddressResolver, "load");
const resolveFarcasterByName = vi.spyOn(farcasterByNameResolver, "load");
const resolveERC20ByTicker = vi.spyOn(erc20ByTickerResolver, "load");
const resolveERC20ByAddress = vi.spyOn(erc20ByAddressResolver, "load");
const resolveURL = vi.spyOn(urlResolver, "load");
const resolveIPFS = vi.spyOn(ipfsResolver, "load");

const options: ResolveCommentReferencesOptions = {
  ensByAddressResolver,
  ensByNameResolver,
  farcasterByAddressResolver,
  farcasterByNameResolver,
  erc20ByTickerResolver,
  erc20ByAddressResolver,
  urlResolver,
  ipfsResolver,
};

describe("resolveCommentReferences", () => {
  beforeEach(() => {
    resolveEnsByName.mockReset();
    resolveEnsByAddress.mockReset();
    resolveFarcasterByAddress.mockReset();
    resolveERC20ByTicker.mockReset();
    resolveERC20ByAddress.mockReset();
    resolveURL.mockReset();
    resolveIPFS.mockReset();
    fetchMock.mockReset();
  });

  describe("ens name", () => {
    it("resolves ens name without @ prefix", async () => {
      resolveEnsByName.mockResolvedValue({
        address: "0x225f137127d9067788314bc7fcc1f36746a3c3B5",
        name: "luc.eth",
        avatarUrl:
          "https://ipfs.io/ipfs/bafkreifnrjhkl7ccr2ifwn2n7ap6dh2way25a6w5x2szegvj5pt4b5nvfu",
        url: "https://app.ens.domains/luc.eth",
      });
      const result = await resolveCommentReferences(
        {
          chainId: 1,
          content: "luc.eth luc.eth",
        },
        options,
      );

      expect(resolveEnsByName).toHaveBeenCalledTimes(2);

      expect(result.status).toBe("success");
      expect(result.references).toEqual([
        {
          type: "ens",
          name: "luc.eth",
          address: "0x225f137127d9067788314bc7fcc1f36746a3c3B5",
          avatarUrl:
            "https://ipfs.io/ipfs/bafkreifnrjhkl7ccr2ifwn2n7ap6dh2way25a6w5x2szegvj5pt4b5nvfu",
          position: {
            start: 0,
            end: 7,
          },
          url: "https://app.ens.domains/luc.eth",
        },
        {
          type: "ens",
          name: "luc.eth",
          address: "0x225f137127d9067788314bc7fcc1f36746a3c3B5",
          avatarUrl:
            "https://ipfs.io/ipfs/bafkreifnrjhkl7ccr2ifwn2n7ap6dh2way25a6w5x2szegvj5pt4b5nvfu",
          position: {
            start: 8,
            end: 15,
          },
          url: "https://app.ens.domains/luc.eth",
        },
      ]);
    });

    it("resolves ens name with @ prefix", async () => {
      resolveEnsByName.mockResolvedValue({
        address: "0x225f137127d9067788314bc7fcc1f36746a3c3B5",
        name: "luc.eth",
        avatarUrl:
          "https://ipfs.io/ipfs/bafkreifnrjhkl7ccr2ifwn2n7ap6dh2way25a6w5x2szegvj5pt4b5nvfu",
        url: "https://app.ens.domains/luc.eth",
      });

      const result = await resolveCommentReferences(
        {
          chainId: 1,
          content: "@luc.eth @luc.eth",
        },
        options,
      );

      expect(resolveEnsByName).toHaveBeenCalledTimes(2);

      expect(result.status).toBe("success");
      expect(result.references).toEqual([
        {
          type: "ens",
          name: "luc.eth",
          address: "0x225f137127d9067788314bc7fcc1f36746a3c3B5",
          avatarUrl:
            "https://ipfs.io/ipfs/bafkreifnrjhkl7ccr2ifwn2n7ap6dh2way25a6w5x2szegvj5pt4b5nvfu",
          position: {
            start: 0,
            end: 8,
          },
          url: "https://app.ens.domains/luc.eth",
        },
        {
          type: "ens",
          name: "luc.eth",
          address: "0x225f137127d9067788314bc7fcc1f36746a3c3B5",
          avatarUrl:
            "https://ipfs.io/ipfs/bafkreifnrjhkl7ccr2ifwn2n7ap6dh2way25a6w5x2szegvj5pt4b5nvfu",
          position: {
            start: 9,
            end: 17,
          },
          url: "https://app.ens.domains/luc.eth",
        },
      ]);
    });

    it("resolves ens name with subdomains", async () => {
      resolveEnsByName.mockResolvedValue({
        address: ("0x" + "0".repeat(40)) as Hex,
        name: "test.normx.eth",
        avatarUrl: null,
        url: "https://app.ens.domains/test.normx.eth",
      });
      const result = await resolveCommentReferences(
        {
          chainId: 1,
          content: "test.normx.eth @test.normx.eth",
        },
        options,
      );

      expect(resolveEnsByName).toHaveBeenCalledTimes(2);

      expect(result.status).toBe("success");
      expect(result.references).toEqual([
        {
          type: "ens",
          name: "test.normx.eth",
          address: ("0x" + "0".repeat(40)) as Hex,
          avatarUrl: null,
          position: {
            start: 0,
            end: 14,
          },
          url: "https://app.ens.domains/test.normx.eth",
        },
        {
          type: "ens",
          name: "test.normx.eth",
          address: ("0x" + "0".repeat(40)) as Hex,
          avatarUrl: null,
          position: {
            start: 15,
            end: 30,
          },
          url: "https://app.ens.domains/test.normx.eth",
        },
      ]);
    });
  });

  describe("farcaster fname", () => {
    it("resolves farcaster fname without @ prefix", async () => {
      resolveFarcasterByName.mockResolvedValue({
        fid: 341794,
        fname: "mskr.fcast.id",
        address: "0x78397D9D185D3a57D01213CBe3Ec1EbAC3EEc77d",
        username: "mskr",
        url: "https://farcaster.xyz/mskr",
        displayName: "mskr",
      });

      const result = await resolveCommentReferences(
        {
          chainId: 1,
          content: "❤️ mskr.fcast.id ❤️ @mskr.fcast.id",
        },
        options,
      );

      expect(resolveFarcasterByName).toHaveBeenCalledTimes(2);

      const expectedReference = {
        fid: 341794,
        fname: "mskr.fcast.id",
        address: "0x78397D9D185D3a57D01213CBe3Ec1EbAC3EEc77d",
        username: "mskr",
        url: "https://farcaster.xyz/mskr",
        displayName: "mskr",
        pfpUrl: null,
      };

      expect(result.status).toBe("success");
      expect(result.references).toEqual([
        {
          type: "farcaster",
          ...expectedReference,
          position: {
            start: 3,
            end: 16,
          },
        },
        {
          type: "farcaster",
          ...expectedReference,
          position: {
            start: 20,
            end: 34,
          },
        },
      ]);
    });
  });

  describe("eth address", () => {
    it("resolves eth address without @ prefix as ens name", async () => {
      const resolvedValue = {
        address: "0x225f137127d9067788314bc7fcc1f36746a3c3B5" as const,
        name: "luc.eth",
        avatarUrl:
          "https://ipfs.io/ipfs/bafkreifnrjhkl7ccr2ifwn2n7ap6dh2way25a6w5x2szegvj5pt4b5nvfu",
        url: "https://app.ens.domains/luc.eth",
      };
      resolveEnsByAddress.mockResolvedValue(resolvedValue);

      const result = await resolveCommentReferences(
        {
          chainId: 1,
          content: "Test 0x225f137127d9067788314bc7fcc1f36746a3c3B5",
        },
        options,
      );

      expect(resolveEnsByAddress).toHaveBeenCalledTimes(1);

      expect(result.status).toBe("success");
      expect(result.references).toEqual([
        {
          type: "ens",
          ...resolvedValue,
          position: {
            start: 5,
            end: 47,
          },
        },
      ]);
    });

    it("resolves eth address without @ prefix as farcaster user", async () => {
      const resolvedValue = {
        fid: 341794,
        url: "https://farcaster.xyz/mskr",
        fname: "mskr.fcast.id",
        username: "mskr",
        displayName: "mskr",
        pfpUrl: "https://i.imgur.com/DyoLsDd.jpg",
        address: "0x78397D9D185D3a57D01213CBe3Ec1EbAC3EEc77d" as const,
      };
      resolveEnsByAddress.mockResolvedValue(null);
      resolveFarcasterByAddress.mockResolvedValue(resolvedValue);

      const result = await resolveCommentReferences(
        {
          chainId: 1,
          content: "Test 0x78397D9D185D3a57D01213CBe3Ec1EbAC3EEc77d",
        },
        options,
      );

      expect(resolveEnsByAddress).toHaveBeenCalledTimes(1);

      expect(result.status).toBe("success");
      expect(result.references).toEqual([
        {
          type: "farcaster",
          address: "0x78397D9D185D3a57D01213CBe3Ec1EbAC3EEc77d",
          fid: 341794,
          fname: "mskr.fcast.id",
          url: "https://farcaster.xyz/mskr",
          username: "mskr",
          displayName: "mskr",
          pfpUrl: "https://i.imgur.com/DyoLsDd.jpg",
          position: {
            start: 5,
            end: 47,
          },
        },
      ]);
    });

    it("resolves eth address without @ prefix as erc20 token", async () => {
      const resolvedValue = {
        address: "0x06450dee7fd2fb8e39061434babcfc05599a6fb8" as const,
        name: "XEN Crypto",
        symbol: "XEN",
        logoURI:
          "https://tokens.1inch.io/0x06450dee7fd2fb8e39061434babcfc05599a6fb8.png",
        decimals: 18,
        chains: [
          {
            chainId: 1,
            caip: "eip155:1/erc20:0x06450dee7fd2fb8e39061434babcfc05599a6fb8",
          },
        ],
      };
      resolveERC20ByAddress.mockResolvedValue(resolvedValue);

      const result = await resolveCommentReferences(
        {
          chainId: 1,
          content: "Test 0x06450dee7fd2fb8e39061434babcfc05599a6fb8",
        },
        options,
      );

      expect(resolveERC20ByAddress).toHaveBeenCalledTimes(1);

      expect(result.status).toBe("success");
      expect(result.references).toEqual([
        {
          type: "erc20",
          ...resolvedValue,
          chainId: null,
          position: {
            start: 5,
            end: 47,
          },
        },
      ]);
    });

    it("does not resolve eth address without @ prefix", async () => {
      const result = await resolveCommentReferences(
        {
          chainId: 1,
          content: "Test 0x06450dee7fd2fb8e39061434babcfc05599a6fb8",
        },
        options,
      );

      expect(result.status).toBe("success");
      expect(result.references).toEqual([]);
    });
  });

  describe("token symbol", () => {
    it("resolves token symbol if it is a valid erc20 token for comment's chain", async () => {
      const resolvedValue = {
        address: "0x06450dee7fd2fb8e39061434babcfc05599a6fb8" as const,
        name: "XEN Crypto",
        symbol: "XEN",
        logoURI:
          "https://tokens.1inch.io/0x06450dee7fd2fb8e39061434babcfc05599a6fb8.png",
        decimals: 18,
        chains: [
          {
            chainId: 1,
            caip: "eip155:1/erc20:0x06450dee7fd2fb8e39061434babcfc05599a6fb8",
          },
        ],
      };
      resolveERC20ByTicker.mockResolvedValue(resolvedValue);

      const result = await resolveCommentReferences(
        {
          chainId: 1,
          content: "Test $XEN",
        },
        options,
      );

      expect(resolveERC20ByTicker).toHaveBeenCalledTimes(1);

      expect(result.status).toBe("success");

      expect(result.references).toEqual([
        {
          type: "erc20",
          ...resolvedValue,
          chainId: 1,
          position: {
            start: 5,
            end: 9,
          },
        },
      ]);
    });
  });

  describe("http url", () => {
    it("resolves a http url", async () => {
      const resolvedValue = {
        type: "webpage" as const,
        url: "https://example.com/",
        title: "Hello",
        description: null,
        opengraph: null,
        favicon: null,
        mediaType: "text/html",
      };

      resolveURL.mockResolvedValue(resolvedValue);

      const result = await resolveCommentReferences(
        {
          chainId: 1,
          content: "👀 https://example.com/?test=true#neheheh 💻",
        },
        options,
      );

      expect(resolveURL).toHaveBeenCalledTimes(1);
      expect(result.status).toBe("success");
      expect(result.references).toEqual([
        {
          ...resolvedValue,
          position: {
            start: 3,
            end: 41,
          },
        },
      ]);
    });

    it("resolves a url with port", async () => {
      const resolvedValue = {
        type: "webpage" as const,
        url: "http://example.com:8080/",
        title: "Hello",
        description: null,
        opengraph: null,
        favicon: null,
        mediaType: "text/html",
      };

      resolveURL.mockResolvedValue(resolvedValue);

      const result = await resolveCommentReferences(
        {
          chainId: 1,
          content: "👀 http://example.com:8080/?test=true#neheheh 💻",
        },
        options,
      );

      expect(resolveURL).toHaveBeenCalledTimes(1);
      expect(resolveURL).toHaveBeenCalledWith(
        "http://example.com:8080/?test=true#neheheh",
      );

      expect(result.status).toBe("success");
      expect(result.references).toEqual([
        {
          ...resolvedValue,
          position: {
            start: 3,
            end: 45,
          },
        },
      ]);
    });
  });

  describe("ipfs url", () => {
    it("resolves a ipfs url", async () => {
      const resolvedValue = {
        type: "webpage" as const,
        url: "https://example.com/",
        title: "Hello",
        description: null,
        opengraph: null,
        favicon: null,
        mediaType: "text/html",
      };

      resolveIPFS.mockResolvedValue(resolvedValue);

      const result = await resolveCommentReferences(
        {
          chainId: 1,
          content:
            "👀 ipfs://QmT3ud1DCSLfbTtPntaHCUSPWTwDDapGSUgK55J7Wc3TKp 💻",
        },
        options,
      );

      expect(resolveIPFS).toHaveBeenCalledTimes(1);
      expect(resolveIPFS).toHaveBeenCalledWith(
        "ipfs://QmT3ud1DCSLfbTtPntaHCUSPWTwDDapGSUgK55J7Wc3TKp",
      );
      expect(result.status).toBe("success");
      expect(result.references).toEqual([
        {
          ...resolvedValue,
          position: {
            start: 3,
            end: 56,
          },
        },
      ]);
    });

    it("resolves a ipfs url with resource path", async () => {
      const resolvedValue = {
        type: "webpage" as const,
        url: "https://example.com/",
        title: "Hello",
        description: null,
        opengraph: null,
        favicon: null,
        mediaType: "text/html",
      };

      resolveIPFS.mockResolvedValue(resolvedValue);

      const result = await resolveCommentReferences(
        {
          chainId: 1,
          content:
            "👀 ipfs://QmT3ud1DCSLfbTtPntaHCUSPWTwDDapGSUgK55J7Wc3TKp/path/to/file.png 💻",
        },
        options,
      );

      expect(resolveIPFS).toHaveBeenCalledTimes(1);
      expect(resolveIPFS).toHaveBeenCalledWith(
        "ipfs://QmT3ud1DCSLfbTtPntaHCUSPWTwDDapGSUgK55J7Wc3TKp/path/to/file.png",
      );
      expect(result.status).toBe("success");
      expect(result.references).toEqual([
        {
          ...resolvedValue,
          position: {
            start: 3,
            end: 73,
          },
        },
      ]);
    });
  });

  it("correctly resolves unicode string", async () => {
    const content =
      "👀 what is 🎶 luc.eth this $USDC 💻   @0x78397D9D185D3a57D01213CBe3Ec1EbAC3EEc77d.";

    resolveEnsByName.mockResolvedValue({
      address: "0x225f137127d9067788314bc7fcc1f36746a3c3B5",
      name: "luc.eth",
      avatarUrl:
        "https://ipfs.io/ipfs/bafkreifnrjhkl7ccr2ifwn2n7ap6dh2way25a6w5x2szegvj5pt4b5nvfu",
      url: "https://app.ens.domains/luc.eth",
    });

    resolveERC20ByTicker.mockResolvedValue({
      address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48" as const,
      decimals: 6,
      name: "USD Coin",
      symbol: "USDC",
      logoURI:
        "https://tokens.1inch.io/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png",
      chains: [
        {
          chainId: 1,
          caip: "eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        },
      ],
    });

    resolveFarcasterByAddress.mockResolvedValue({
      fid: 341794,
      url: "https://farcaster.xyz/mskr",
      fname: "mskr.fcast.id",
      username: "mskr",
      displayName: "mskr",
      pfpUrl: "https://i.imgur.com/DyoLsDd.jpg",
      address: "0x78397D9D185D3a57D01213CBe3Ec1EbAC3EEc77d" as const,
    });

    const result = await resolveCommentReferences(
      {
        chainId: 1,
        content,
      },
      options,
    );

    expect(result.status).toBe("success");
    expect(result.references).toEqual([
      {
        type: "ens",
        address: "0x225f137127d9067788314bc7fcc1f36746a3c3B5",
        name: "luc.eth",
        avatarUrl:
          "https://ipfs.io/ipfs/bafkreifnrjhkl7ccr2ifwn2n7ap6dh2way25a6w5x2szegvj5pt4b5nvfu",
        url: "https://app.ens.domains/luc.eth",
        position: {
          start: 14,
          end: 21,
        },
      },
      {
        type: "erc20",
        address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        name: "USD Coin",
        symbol: "USDC",
        logoURI:
          "https://tokens.1inch.io/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png",
        decimals: 6,
        chainId: 1,
        position: {
          start: 27,
          end: 32,
        },
        chains: [
          {
            chainId: 1,
            caip: "eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
          },
        ],
      },
      {
        type: "farcaster",
        address: "0x78397D9D185D3a57D01213CBe3Ec1EbAC3EEc77d",
        fid: 341794,
        fname: "mskr.fcast.id",
        url: "https://farcaster.xyz/mskr",
        username: "mskr",
        displayName: "mskr",
        pfpUrl: "https://i.imgur.com/DyoLsDd.jpg",
        position: {
          start: 38,
          end: 81,
        },
      },
    ]);
  });

  describe("status", () => {
    it("resolves to success if all resolutions are successful", async () => {
      resolveURL.mockResolvedValueOnce({
        type: "webpage",
        url: "https://example.com/",
        title: "Hello",
        description: null,
        opengraph: null,
        favicon: null,
        mediaType: "text/html",
      });
      resolveEnsByName.mockResolvedValueOnce({
        address: "0x225f137127d9067788314bc7fcc1f36746a3c3B5",
        name: "luc.eth",
        avatarUrl:
          "https://ipfs.io/ipfs/bafkreifnrjhkl7ccr2ifwn2n7ap6dh2way25a6w5x2szegvj5pt4b5nvfu",
        url: "https://app.ens.domains/luc.eth",
      });
      resolveERC20ByTicker.mockResolvedValueOnce({
        address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        name: "USD Coin",
        symbol: "USDC",
        logoURI:
          "https://tokens.1inch.io/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png",
        decimals: 6,
        chains: [
          {
            chainId: 1,
            caip: "eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
          },
        ],
      });

      const result = await resolveCommentReferences(
        {
          content:
            "👀 https://example.com/?test=true#neheheh 💻 @luc.eth $USDC",
          chainId: 1,
        },
        options,
      );

      expect(result.status).toBe("success");
    });

    it("resolves to partial if some resolutions are successful", async () => {
      resolveURL.mockResolvedValueOnce({
        type: "webpage",
        url: "https://example.com/",
        title: "Hello",
        description: null,
        opengraph: null,
        favicon: null,
        mediaType: "text/html",
      });
      resolveEnsByName.mockRejectedValueOnce(new Error("Failed to resolve"));
      resolveERC20ByTicker.mockResolvedValueOnce({
        address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        name: "USD Coin",
        symbol: "USDC",
        logoURI:
          "https://tokens.1inch.io/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png",
        decimals: 6,
        chains: [
          {
            chainId: 1,
            caip: "eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
          },
        ],
      });

      const result = await resolveCommentReferences(
        {
          content:
            "👀 https://example.com/?test=true#neheheh 💻 @luc.eth $USDC",
          chainId: 1,
        },
        options,
      );

      expect(result.status).toBe("partial");
    });

    it("resolves to failed if all resolutions are failed", async () => {
      resolveURL.mockRejectedValueOnce(new Error("Failed to resolve"));
      resolveEnsByName.mockRejectedValueOnce(new Error("Failed to resolve"));
      resolveERC20ByTicker.mockRejectedValueOnce(
        new Error("Failed to resolve"),
      );

      const result = await resolveCommentReferences(
        {
          content:
            "👀 https://example.com/?test=true#neheheh 💻 @luc.eth $USDC",
          chainId: 1,
        },
        options,
      );

      expect(result.status).toBe("failed");
    });
  });

  describe("erc20 caip url", () => {
    it("resolves erc20 caip url prefixed with $", async () => {
      resolveERC20ByAddress.mockResolvedValueOnce({
        address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        name: "USD Coin",
        symbol: "USDC",
        logoURI:
          "https://tokens.1inch.io/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png",
        decimals: 6,
        chains: [
          {
            chainId: 1,
            caip: "eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
          },
        ],
      });

      const result = await resolveCommentReferences(
        {
          chainId: 1,
          content: "$eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        },
        options,
      );

      expect(resolveERC20ByAddress).toHaveBeenCalledWith(
        "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
      );

      expect(result.status).toBe("success");
      expect(result.references).toEqual([
        {
          type: "erc20",
          address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
          name: "USD Coin",
          symbol: "USDC",
          logoURI:
            "https://tokens.1inch.io/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png",
          decimals: 6,
          chainId: 1,
          position: {
            start: 0,
            end: 58,
          },
          chains: [
            {
              chainId: 1,
              caip: "eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
            },
          ],
        },
      ]);
    });

    it("resolves erc20 caip url prefixed with @", async () => {
      resolveERC20ByAddress.mockResolvedValueOnce({
        address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        name: "USD Coin",
        symbol: "USDC",
        logoURI:
          "https://tokens.1inch.io/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png",
        decimals: 6,
        chains: [
          {
            chainId: 1,
            caip: "eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
          },
        ],
      });

      const result = await resolveCommentReferences(
        {
          chainId: 1,
          content: "@eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        },
        options,
      );

      expect(resolveERC20ByAddress).toHaveBeenCalledWith(
        "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
      );

      expect(result.status).toBe("success");
      expect(result.references).toEqual([
        {
          type: "erc20",
          address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
          name: "USD Coin",
          symbol: "USDC",
          logoURI:
            "https://tokens.1inch.io/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png",
          decimals: 6,
          chainId: 1,
          position: {
            start: 0,
            end: 58,
          },
          chains: [
            {
              chainId: 1,
              caip: "eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
            },
          ],
        },
      ]);
    });

    it("resolves erc20 caip url without prefix", async () => {
      resolveERC20ByAddress.mockResolvedValueOnce({
        address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        name: "USD Coin",
        symbol: "USDC",
        logoURI:
          "https://tokens.1inch.io/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png",
        decimals: 6,
        chains: [
          {
            chainId: 1,
            caip: "eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
          },
        ],
      });

      const result = await resolveCommentReferences(
        {
          chainId: 1,
          content: "$eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        },
        options,
      );

      expect(result.status).toBe("success");
      expect(result.references).toEqual([
        {
          type: "erc20",
          address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
          name: "USD Coin",
          symbol: "USDC",
          logoURI:
            "https://tokens.1inch.io/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png",
          decimals: 6,
          chainId: 1,
          position: {
            start: 0,
            end: 58,
          },
          chains: [
            {
              chainId: 1,
              caip: "eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
            },
          ],
        },
      ]);
    });
  });
});
