import { describe, it, beforeEach, expect, assert } from "vitest";
import { runAsync } from "../utils.js";

describe("runAsync", () => {
  let attemptCount: number;
  let abortController: AbortController;

  beforeEach(() => {
    attemptCount = 0;
    abortController = new AbortController();
  });

  describe("basic functionality", () => {
    it("should execute a simple async function successfully", async () => {
      const result = await runAsync(async () => {
        return "success";
      }, {});

      expect(result).toBe("success");
    });

    it("should pass signal to the function", async () => {
      let receivedSignal: AbortSignal | undefined;

      await runAsync(
        async (signal) => {
          receivedSignal = signal;
          return "success";
        },
        { signal: abortController.signal },
      );

      expect(receivedSignal).toBe(abortController.signal);
    });

    it("should handle functions that don't use the signal", async () => {
      const result = await runAsync(
        async () => {
          return "success";
        },
        { signal: abortController.signal },
      );

      expect(result).toBe("success");
    });
  });

  describe("retry functionality", () => {
    it("should retry failed operations", async () => {
      const result = await runAsync(
        async () => {
          attemptCount++;
          if (attemptCount < 3) {
            throw new Error("Temporary failure");
          }
          return "success after retries";
        },
        { retries: 3 },
      );

      expect(result).toBe("success after retries");
      expect(attemptCount).toBe(3);
    });

    it("should not retry if retries is 0", async () => {
      await expect(
        runAsync(
          async () => {
            attemptCount++;
            throw new Error("Failure");
          },
          { retries: 0 },
        ),
      ).rejects.toThrow("Failure");
    });

    it("should not retry if retries is undefined", async () => {
      await expect(
        runAsync(async () => {
          attemptCount++;
          throw new Error("Failure");
        }, {}),
      ).rejects.toThrow("Failure");
    });

    it("should throw the last error after all retries are exhausted", async () => {
      await expect(
        runAsync(
          async () => {
            attemptCount++;
            throw new Error(`Attempt ${attemptCount} failed`);
          },
          { retries: 2 },
        ),
      ).rejects.toThrow("Attempt 3 failed");

      expect(attemptCount).toBe(3);
    });
  });

  describe("abort signal functionality", () => {
    it("should abort before execution if signal is already aborted", async () => {
      abortController.abort("Test abort");

      await expect(
        runAsync(
          async () => {
            assert.fail("Function should not be called");
          },
          { signal: abortController.signal },
        ),
      ).rejects.toThrow("Test abort");
    });

    it("should abort during execution", async () => {
      let functionCalled = false;

      const promise = runAsync(
        async (signal) => {
          functionCalled = true;
          // Simulate a long-running operation that checks the signal
          await new Promise((resolve) => setTimeout(resolve, 100));

          // Check if aborted during execution
          if (signal?.aborted) {
            throw signal.reason;
          }

          assert.fail("Should not reach here");
        },
        { signal: abortController.signal },
      );

      // Abort after a short delay
      setTimeout(() => {
        abortController.abort("Aborted during execution");
      }, 10);

      await expect(promise).rejects.toThrow("Aborted during execution");
      expect(functionCalled).toBe(true);
    });

    it("should not retry if aborted", async () => {
      abortController.abort("Aborted");

      await expect(
        runAsync(
          async () => {
            attemptCount++;
            throw new Error("Failure");
          },
          { signal: abortController.signal, retries: 3 },
        ),
      ).rejects.toThrow("Aborted");

      expect(attemptCount).toBe(0);
    });

    it("should abort during retry attempts", async () => {
      const promise = runAsync(
        async (signal) => {
          if (attemptCount === 1) {
            abortController.abort("Aborted during retries");
          }

          attemptCount++;

          // Check if aborted during execution
          if (signal?.aborted) {
            throw signal.reason;
          }

          throw new Error("Failure");
        },
        { signal: abortController.signal, retries: 5 },
      );

      await expect(promise).rejects.toThrow("Aborted during retries");
      expect(attemptCount).toBeGreaterThan(0);
    });
  });

  describe("backoff strategies", () => {
    it("should use exponential backoff", async () => {
      const startTime = Date.now();
      const delays: number[] = [];

      await expect(
        runAsync(
          async () => {
            attemptCount++;
            delays.push(Date.now() - startTime);
            throw new Error("Failure");
          },
          { retries: 3, backoff: { type: "exponential", delay: 2 } },
        ),
      ).rejects.toThrow("Failure");

      expect(attemptCount).toBe(4);
      expect(delays).toHaveLength(4);
      expect(delays[0]).toBeLessThan(delays[1]!);
      expect(delays[1]).toBeLessThan(delays[2]!);
      expect(delays[2]).toBeLessThan(delays[3]!);
    });

    it("should use constant backoff", async () => {
      const startTime = Date.now();
      const delays: number[] = [];

      await expect(
        runAsync(
          async () => {
            attemptCount++;
            delays.push(Date.now() - startTime);
            throw new Error("Failure");
          },
          { retries: 2, backoff: { type: "constant", delay: 2 } },
        ),
      ).rejects.toThrow("Failure");

      expect(attemptCount).toBe(3);
      expect(delays).toHaveLength(3);
    });

    it("should not delay with no backoff", async () => {
      await expect(
        runAsync(
          async () => {
            attemptCount++;
            throw new Error("Failure");
          },
          { retries: 2, backoff: { type: "none" } },
        ),
      ).rejects.toThrow("Failure");

      expect(attemptCount).toBe(3);
    });
  });

  describe("edge cases", () => {
    it("should handle functions that return promises", async () => {
      const result = await runAsync(async () => {
        return Promise.resolve("success");
      }, {});

      expect(result).toBe("success");
    });

    it("should handle functions that throw immediately", async () => {
      await expect(
        runAsync(
          async () => {
            throw new Error("Immediate failure");
          },
          { retries: 2 },
        ),
      ).rejects.toThrow("Immediate failure");
    });

    it("should handle functions that throw after async operations", async () => {
      await expect(
        runAsync(
          async () => {
            await new Promise((resolve) => setTimeout(resolve, 10));
            throw new Error("Delayed failure");
          },
          { retries: 2 },
        ),
      ).rejects.toThrow("Delayed failure");
    });

    it("should handle undefined signal", async () => {
      const result = await runAsync(async (signal) => {
        expect(signal).toBe(undefined);
        return "success";
      }, {});

      expect(result).toBe("success");
    });

    it("should handle null signal", async () => {
      const result = await runAsync(
        async (signal) => {
          expect(signal).toBe(undefined);
          return "success";
        },
        { signal: undefined },
      );

      expect(result).toBe("success");
    });
  });

  describe("integration scenarios", () => {
    it("should handle fetch-like operations with abort signal", async () => {
      const mockFetch = async (signal?: AbortSignal) => {
        if (signal?.aborted) {
          throw new Error("Request aborted");
        }

        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 0));

        if (signal?.aborted) {
          throw new Error("Request aborted");
        }

        return { ok: true, data: "response" };
      };

      const result = await runAsync(
        async (signal) => {
          return await mockFetch(signal);
        },
        { signal: abortController.signal },
      );

      expect(result.ok).toBe(true);
      expect(result.data).toBe("response");
    });

    it("should abort fetch-like operations", async () => {
      const mockFetch = async (signal?: AbortSignal) => {
        if (signal?.aborted) {
          throw new Error("Request aborted");
        }

        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 0));

        if (signal?.aborted) {
          throw new Error("Request aborted");
        }

        return { ok: true, data: "response" };
      };

      const promise = runAsync(
        async (signal) => {
          return await mockFetch(signal);
        },
        { signal: abortController.signal },
      );

      abortController.abort("Aborted");

      await expect(promise).rejects.toThrow("Request aborted");
    });

    it("should retry failed network operations", async () => {
      let networkFailures = 0;
      const mockFetch = async () => {
        networkFailures++;
        if (networkFailures < 3) {
          throw new Error("Network error");
        }
        return { ok: true, data: "success" };
      };

      const result = await runAsync(
        async () => {
          return await mockFetch();
        },
        { retries: 3 },
      );

      expect(result.ok).toBe(true);
      expect(result.data).toBe("success");
      expect(networkFailures).toBe(3);
    });
  });
});
