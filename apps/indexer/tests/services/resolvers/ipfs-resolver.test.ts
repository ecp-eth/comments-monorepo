import fs from "fs";
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  IPFSResolver,
  IPFS_URL_REGEX,
} from "../../../src/services/resolvers/ipfs-resolver";
import { HTTPResolver } from "../../../src/services/resolvers/http-resolver";
import { type PinataSDK } from "pinata";
import nock from "nock";
import path from "path";
import { metrics } from "../../../src/services/metrics";

// Mock environment variables
vi.mock("../../../src/env", () => ({
  env: {
    PINATA_JWT: "test-jwt",
    PINATA_GATEWAY: "test-gateway.pinata.cloud",
  },
}));

describe("IPFS Regex", () => {
  it("should match valid IPFS URLs with only CID", () => {
    const url = "ipfs://QmTestHash";
    const match = url.match(IPFS_URL_REGEX);

    if (!match) {
      expect.fail("Match is null");
    }

    expect(match[1]).toBe("QmTestHash");
  });

  it("should match valid IPFS URLs with CID and path", () => {
    const url = "ipfs://QmTestHash/path/to/file.txt";
    const match = url.match(IPFS_URL_REGEX);

    if (!match) {
      expect.fail("Match is null");
    }

    expect(match[1]).toBe("QmTestHash");
    expect(match[2]).toBe("/path/to/file.txt");
  });

  it("should match typical metadata.json ipfs URL", () => {
    const url = "ipfs://QmTestHash/metadata.json";
    const match = url.match(IPFS_URL_REGEX);

    if (!match) {
      expect.fail("Match is null");
    }

    expect(match[1]).toBe("QmTestHash");
    expect(match[2]).toBe("/metadata.json");
  });
});

describe("IPFS Resolver", () => {
  const pngBuffer = fs.readFileSync(
    path.join(__dirname, "fixtures", "example-image.png"),
  );

  beforeEach(() => {
    nock.cleanAll();
    vi.resetAllMocks();
  });

  it("should resolve IPFS protocol URL with only CID", async () => {
    nock("https://test-gateway.pinata.cloud")
      .get("/ipfs/QmTestHash")
      .times(2)
      .reply(200, pngBuffer, {
        "content-type": "image/png",
        "content-length": pngBuffer.length.toString(),
      });
    const httpResolver = new HTTPResolver({ metrics });
    vi.spyOn(httpResolver, "load");
    const pinataSDK = {
      config: {
        pinataGateway: "https://test-gateway.pinata.cloud",
      },
      upload: {
        public: {
          cid: vi.fn().mockResolvedValue({}),
        },
      },
    } as unknown as PinataSDK;
    const ipfsResolver = new IPFSResolver({
      httpResolver,
      pinataSDK,
      retryCount: 3,
      retryTimeout: 300,
      metrics,
    });
    const ipfsUrl = "ipfs://QmTestHash";
    const result = await ipfsResolver.load(ipfsUrl);

    if (!result) {
      expect.fail("Result is null");
    }

    if (result.type !== "image") {
      expect.fail("Result is not an image");
    }

    expect(result.url).toBe(
      "https://test-gateway.pinata.cloud/ipfs/QmTestHash",
    );
    expect(httpResolver.load).toHaveBeenCalledWith(
      "https://test-gateway.pinata.cloud/ipfs/QmTestHash",
    );
    expect(result.mediaType).toBe("image/png");
    expect(result.dimension).toEqual({
      width: 5067,
      height: 1865,
    });
  });

  it("should resolve IPFS protocol URL with CID and path", async () => {
    nock("https://test-gateway.pinata.cloud")
      .get("/ipfs/QmTestHash/path/to/file.png")
      .times(2)
      .reply(200, pngBuffer, {
        "content-type": "image/png",
        "content-length": pngBuffer.length.toString(),
      });

    const httpResolver = new HTTPResolver({ metrics });
    vi.spyOn(httpResolver, "load");
    const pinataSDK = {
      config: {
        pinataGateway: "https://test-gateway.pinata.cloud",
      },
      upload: {
        public: {
          cid: vi.fn().mockResolvedValue({}),
        },
      },
    } as unknown as PinataSDK;
    const ipfsResolver = new IPFSResolver({
      httpResolver,
      pinataSDK,
      retryCount: 3,
      retryTimeout: 300,
      metrics,
    });
    const ipfsUrl = "ipfs://QmTestHash/path/to/file.png";
    const result = await ipfsResolver.load(ipfsUrl);

    if (!result) {
      expect.fail("Result is null");
    }

    if (result.type !== "image") {
      expect.fail("Result is not an image");
    }

    expect(httpResolver.load).toHaveBeenCalledWith(
      "https://test-gateway.pinata.cloud/ipfs/QmTestHash/path/to/file.png",
    );
    expect(result.url).toBe(
      "https://test-gateway.pinata.cloud/ipfs/QmTestHash/path/to/file.png",
    ); // Should preserve original IPFS URL
    expect(result.mediaType).toBe("image/png");
    expect(result.dimension).toEqual({
      width: 5067,
      height: 1865,
    });
  });

  it("should fallback to ipfs.io when Pinata fails to pin CID", async () => {
    // Mock URL resolver to load from ipfs.io
    nock("https://ipfs.io")
      .get("/ipfs/QmFallbackHash")
      .times(2)
      .reply(200, pngBuffer, {
        "content-type": "image/png",
        "content-length": pngBuffer.length.toString(),
      });

    const httpResolver = new HTTPResolver({ metrics });
    vi.spyOn(httpResolver, "load");

    // Mock Pinata SDK to fail
    const pinataSDK = {
      config: {
        pinataGateway: "https://test-gateway.pinata.cloud",
      },
      upload: {
        public: {
          cid: vi.fn().mockImplementation(() => {
            throw new Error("Pinata pinning failed");
          }),
        },
      },
    } as unknown as PinataSDK;

    const fallbackResolver = new IPFSResolver({
      httpResolver,
      pinataSDK: pinataSDK,
      retryCount: 3,
      retryTimeout: 300,
      metrics,
    });

    const ipfsUrl = "ipfs://QmFallbackHash";
    const result = await fallbackResolver.load(ipfsUrl);

    if (!result) {
      expect.fail("Result is null");
    }

    if (result.type !== "image") {
      expect.fail("Result is not an image");
    }

    // Verify that the URL resolver was called with the ipfs.io fallback URL
    expect(httpResolver.load).toHaveBeenCalledWith(
      "https://ipfs.io/ipfs/QmFallbackHash",
    );

    // Verify the result uses the ipfs.io URL
    expect(result.url).toBe("https://ipfs.io/ipfs/QmFallbackHash");
    expect(result.mediaType).toBe("image/png");
    expect(result.dimension).toEqual({
      width: 5067,
      height: 1865,
    });
  });

  it("should retry 3 times if pinned url is not ready", async () => {
    // Mock URL resolver to load from ipfs.io
    nock("https://test-gateway.pinata.cloud")
      .get("/ipfs/QmTestHash/path/to/file.png")
      .reply(403)
      .get("/ipfs/QmTestHash/path/to/file.png")
      .reply(403)
      .get("/ipfs/QmTestHash/path/to/file.png")
      .times(2)
      .reply(200, pngBuffer, {
        "content-type": "image/png",
        "content-length": pngBuffer.length.toString(),
      });

    const httpResolver = new HTTPResolver({ metrics });
    vi.spyOn(httpResolver, "load");

    // Mock Pinata SDK to fail
    const pinataSDK = {
      config: {
        pinataGateway: "https://test-gateway.pinata.cloud",
      },
      upload: {
        public: {
          cid: vi.fn().mockResolvedValue({}),
        },
      },
    } as unknown as PinataSDK;

    const ipfsResolver = new IPFSResolver({
      httpResolver,
      pinataSDK: pinataSDK,
      retryCount: 3,
      retryTimeout: 300,
      metrics,
    });

    const ipfsUrl = "ipfs://QmTestHash/path/to/file.png";
    const result = await ipfsResolver.load(ipfsUrl);

    if (!result) {
      expect.fail("Result is null");
    }

    if (result.type !== "image") {
      expect.fail("Result is not an image");
    }

    // Verify that the URL resolver was called with the ipfs.io fallback URL
    expect(httpResolver.load).toHaveBeenCalledWith(
      "https://test-gateway.pinata.cloud/ipfs/QmTestHash/path/to/file.png",
    );

    // Verify the result uses the ipfs.io URL
    expect(result.url).toBe(
      "https://test-gateway.pinata.cloud/ipfs/QmTestHash/path/to/file.png",
    );
    expect(result.mediaType).toBe("image/png");
    expect(result.dimension).toEqual({
      width: 5067,
      height: 1865,
    });
  });
});
