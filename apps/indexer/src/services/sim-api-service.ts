import z from "zod";
import { HexSchema, type Hex } from "@ecp.eth/sdk/core";
import { type ChainID } from "../resolvers";
import {
  type ISIMAPIService,
  type SIMAPITokenInfoSchemaType,
  SIMAPITokenInfoSchema,
} from "./types";
import PQueue from "p-queue";
import { env } from "../env";

const SIM_TOKEN_INFO_URL = "https://api.sim.dune.com/v1/evm/token-info/";

export class SIMAPIError extends Error {
  constructor(
    message: string,
    readonly response: Response,
  ) {
    super(message);
    this.name = "SIMAPIError";
  }
}

const SIMResponseSchema = z.object({
  contract_address: HexSchema,
  tokens: z.array(z.record(z.string(), z.unknown())),
});

export class SIMAPIService implements ISIMAPIService {
  private readonly queue: PQueue;
  constructor(
    private readonly simApiKey: string,
    private readonly maxConcurrency: number = 5,
    private readonly intervalCap: number = 5,
    private readonly interval: number = 1000,
  ) {
    this.queue = new PQueue({
      concurrency: this.maxConcurrency,
      intervalCap: this.intervalCap,
      interval: this.interval,
    });
  }
  async getTokenInfo(
    address: Hex,
    chainIds: ChainID[],
  ): Promise<SIMAPITokenInfoSchemaType[]> {
    const tokenInfos: SIMAPITokenInfoSchemaType[] = [];

    await Promise.all(
      chainIds.map(async (chainId) => {
        const url = new URL(`${address}`, SIM_TOKEN_INFO_URL);
        url.searchParams.set("chain_ids", chainId.toString());

        const response = await this.throttledFetchTokenInfo(url, {
          headers: {
            "X-Sim-Api-Key": this.simApiKey,
          },
        });

        if (!response.ok) {
          throw new SIMAPIError(
            `Failed to fetch token info for ${address}`,
            response,
          );
        }

        const parseResult = SIMResponseSchema.safeParse(await response.json());

        if (!parseResult.success) {
          // should throw an error if it happens so it can be marked as failed and retried
          throw new SIMAPIError("Failed to parse SIM response", response);
        }

        for (const token of parseResult.data.tokens) {
          const tokenInfoResult = SIMAPITokenInfoSchema.safeParse(token);

          if (!tokenInfoResult.success) {
            continue;
          }

          tokenInfos.push(tokenInfoResult.data);
        }
      }),
    );

    return tokenInfos;
  }

  private throttledFetchTokenInfo(...args: Parameters<typeof fetch>) {
    return this.queue.add(async function unthrottledFetch() {
      const response = await fetch(...args);

      if (response.status === 429) {
        const retryAfter =
          parseInt(response.headers.get("Retry-After") ?? "") || 1;
        await wait(retryAfter * 1000);
        return unthrottledFetch();
      }

      return response;
    });
  }
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const simAPIService = new SIMAPIService(env.SIM_API_KEY);
