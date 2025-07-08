import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
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

      assert.equal(result, "success");
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

      assert.equal(receivedSignal, abortController.signal);
    });

    it("should handle functions that don't use the signal", async () => {
      const result = await runAsync(
        async () => {
          return "success";
        },
        { signal: abortController.signal },
      );

      assert.equal(result, "success");
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

      assert.equal(result, "success after retries");
      assert.equal(attemptCount, 3);
    });

    it("should not retry if retries is 0", async () => {
      try {
        await runAsync(
          async () => {
            attemptCount++;
            throw new Error("Failure");
          },
          { retries: 0 },
        );

        assert.fail("Should have thrown an error");
      } catch (error) {
        assert.equal(attemptCount, 1);
        assert(error instanceof Error);
        assert.equal(error.message, "Failure");
      }
    });

    it("should not retry if retries is undefined", async () => {
      try {
        await runAsync(async () => {
          attemptCount++;
          throw new Error("Failure");
        }, {});

        assert.fail("Should have thrown an error");
      } catch (error) {
        assert.equal(attemptCount, 1);
        assert(error instanceof Error);
        assert.equal(error.message, "Failure");
      }
    });

    it("should throw the last error after all retries are exhausted", async () => {
      try {
        await runAsync(
          async () => {
            attemptCount++;
            throw new Error(`Attempt ${attemptCount} failed`);
          },
          { retries: 2 },
        );

        assert.fail("Should have thrown an error");
      } catch (error) {
        assert.equal(attemptCount, 3); // 1 initial + 2 retries
        assert(error instanceof Error);
        assert.equal(error.message, "Attempt 3 failed");
      }
    });
  });

  describe("abort signal functionality", () => {
    it("should abort before execution if signal is already aborted", async () => {
      abortController.abort("Test abort");

      try {
        await runAsync(
          async () => {
            assert.fail("Function should not be called");
          },
          { signal: abortController.signal },
        );

        assert.fail("Should have thrown an error");
      } catch (error) {
        assert.equal(error, "Test abort");
      }
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

      try {
        await promise;
        assert.fail("Should have thrown an error");
      } catch (error) {
        assert(functionCalled, "Function should have been called");
        assert.equal(error, "Aborted during execution");
      }
    });

    it("should not retry if aborted", async () => {
      abortController.abort("Aborted");

      try {
        await runAsync(
          async () => {
            attemptCount++;
            throw new Error("Failure");
          },
          { signal: abortController.signal, retries: 3 },
        );

        assert.fail("Should have thrown an error");
      } catch (error) {
        assert.equal(attemptCount, 0); // Should not even attempt once
        assert.equal(error, "Aborted");
      }
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

      try {
        await promise;
        assert.fail("Should have thrown an error");
      } catch (error) {
        assert(attemptCount >= 1, "Should have attempted at least once");
        assert.equal(error, "Aborted during retries");
      }
    });
  });

  describe("backoff strategies", () => {
    it("should use exponential backoff", async () => {
      const startTime = Date.now();
      const delays: number[] = [];

      try {
        await runAsync(
          async () => {
            attemptCount++;
            delays.push(Date.now() - startTime);
            throw new Error("Failure");
          },
          {
            retries: 3,
            backoff: { type: "exponential", delay: 2 },
          },
        );

        assert.fail("Should have thrown an error");
      } catch (error) {
        assert.equal(attemptCount, 4); // 1 initial + 3 retries
        assert(error instanceof Error);
        assert.equal(error.message, "Failure");

        // Check that delays are roughly exponential (allowing for some timing variance)
        assert(
          delays[1] !== undefined && delays[1] >= 2,
          "First retry should have at least 2ms delay",
        );
        assert(
          delays[2] !== undefined && delays[2] >= 4,
          "Second retry should have at least 4ms delay",
        );
        assert(
          delays[3] !== undefined && delays[3] >= 8,
          "Third retry should have at least 8ms delay",
        );
      }
    });

    it("should use constant backoff", async () => {
      const startTime = Date.now();
      const delays: number[] = [];

      try {
        await runAsync(
          async () => {
            attemptCount++;
            delays.push(Date.now() - startTime);
            throw new Error("Failure");
          },
          {
            retries: 2,
            backoff: { type: "constant", delay: 2 },
          },
        );

        assert.fail("Should have thrown an error");
      } catch (error) {
        assert(error instanceof Error);
        assert.equal(error.message, "Failure");
        assert.equal(attemptCount, 3); // 1 initial + 2 retries

        // Check that delays are roughly constant (allowing for some timing variance)
        assert(
          delays[1] !== undefined && delays[1] >= 2,
          "First retry should have at least 2ms delay",
        );
        assert(
          delays[2] !== undefined && delays[2] >= 2,
          "Second retry should have at least 2ms delay",
        );
      }
    });

    it("should not delay with no backoff", async () => {
      const startTime = Date.now();

      try {
        await runAsync(
          async () => {
            attemptCount++;
            throw new Error("Failure");
          },
          {
            retries: 2,
            backoff: { type: "none" },
          },
        );

        assert.fail("Should have thrown an error");
      } catch (error) {
        assert(error instanceof Error);
        assert.equal(error.message, "Failure");
        const totalTime = Date.now() - startTime;
        assert.equal(attemptCount, 3); // 1 initial + 2 retries
        assert(totalTime < 100, "Should complete quickly without backoff");
      }
    });
  });

  describe("edge cases", () => {
    it("should handle functions that return promises", async () => {
      const result = await runAsync(async () => {
        return Promise.resolve("success");
      }, {});

      assert.equal(result, "success");
    });

    it("should handle functions that throw immediately", async () => {
      try {
        await runAsync(
          async () => {
            throw new Error("Immediate failure");
          },
          { retries: 2 },
        );

        assert.fail("Should have thrown an error");
      } catch (error) {
        assert(error instanceof Error);
        assert.equal(error.message, "Immediate failure");
      }
    });

    it("should handle functions that throw after async operations", async () => {
      try {
        await runAsync(
          async () => {
            await new Promise((resolve) => setTimeout(resolve, 10));
            throw new Error("Delayed failure");
          },
          { retries: 2 },
        );

        assert.fail("Should have thrown an error");
      } catch (error) {
        assert(error instanceof Error);
        assert.equal(error.message, "Delayed failure");
      }
    });

    it("should handle undefined signal", async () => {
      const result = await runAsync(async (signal) => {
        assert.equal(signal, undefined);
        return "success";
      }, {});

      assert.equal(result, "success");
    });

    it("should handle null signal", async () => {
      const result = await runAsync(
        async (signal) => {
          assert.equal(signal, undefined);
          return "success";
        },
        { signal: undefined },
      );

      assert.equal(result, "success");
    });
  });

  describe("integration scenarios", () => {
    it("should handle fetch-like operations with abort signal", async () => {
      const mockFetch = async (signal?: AbortSignal) => {
        if (signal?.aborted) {
          throw new Error("Request aborted");
        }

        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 50));

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

      assert.equal(result.ok, true);
      assert.equal(result.data, "response");
    });

    it("should abort fetch-like operations", async () => {
      const mockFetch = async (signal?: AbortSignal) => {
        if (signal?.aborted) {
          throw new Error("Request aborted");
        }

        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 100));

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

      // Abort after a short delay
      setTimeout(() => {
        abortController.abort("Aborted");
      }, 10);

      try {
        await promise;
        assert.fail("Should have thrown an error");
      } catch (error) {
        assert(error instanceof Error);
        // The function throws "Request aborted" when it detects the signal is aborted
        assert.equal(error.message, "Request aborted");
      }
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

      assert.equal(result.ok, true);
      assert.equal(result.data, "success");
      assert.equal(networkFailures, 3);
    });
  });
});
