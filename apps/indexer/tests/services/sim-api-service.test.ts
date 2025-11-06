import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SIMAPIService } from "../../src/services/sim-api-service";
import type { Hex } from "@ecp.eth/sdk/core";

describe("SIMAPIService", () => {
  const mockFetch = vi.fn();
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = mockFetch;
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe("getTokenInfo", () => {
    it("should retry on 429 rate limit response", async () => {
      const service = new SIMAPIService("test-api-key", 5, 5, 1000);
      const address = "0x43a8cab15d06d3a5fe5854d714c37e7e9246f170" as Hex;

      // First call returns 429 with Retry-After header
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          headers: {
            get: vi.fn((header: string) => {
              if (header === "Retry-After") return "1";
              return null;
            }),
          },
        })
        // Second call after retry succeeds
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            contract_address: address,
            tokens: [
              {
                chain_id: 1,
                chain: "ethereum",
                price_usd: 1.0,
                pool_size: 1000,
                total_supply: "1000000",
                fully_diluted_value: 1000000,
                symbol: "TEST",
                name: "Test Token",
                decimals: 18,
                logo: "https://example.com/logo.png",
              },
            ],
          }),
        });

      const result = await service.getTokenInfo(address, [1]);

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(1);
      expect(result[0]?.symbol).toBe("TEST");
    });

    it("should use default retry delay of 1 second when Retry-After header is missing", async () => {
      const service = new SIMAPIService("test-api-key", 5, 5, 1000);
      const address = "0x43a8cab15d06d3a5fe5854d714c37e7e9246f170" as Hex;

      const startTime = Date.now();

      // First call returns 429 without Retry-After header
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          headers: {
            get: vi.fn(() => null), // No Retry-After header
          },
        })
        // Second call after retry succeeds
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            contract_address: address,
            tokens: [
              {
                chain_id: 1,
                chain: "ethereum",
                price_usd: 1.0,
                pool_size: 1000,
                total_supply: "1000000",
                fully_diluted_value: 1000000,
                symbol: "TEST",
                name: "Test Token",
                decimals: 18,
                logo: "https://example.com/logo.png",
              },
            ],
          }),
        });

      await service.getTokenInfo(address, [1]);

      const elapsedTime = Date.now() - startTime;
      // Should wait at least 1 second (1000ms) for retry
      // using 900 to allow some margin for test execution
      expect(elapsedTime).toBeGreaterThanOrEqual(900);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
});
