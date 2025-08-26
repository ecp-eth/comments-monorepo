import DataLoader from "dataloader";
import { z } from "zod";
import { ERC20Caip19Schema } from "../lib/schemas.ts";
import { HexSchema } from "@ecp.eth/sdk/core";

const tokenSchema = z.object({
  address: HexSchema,
  chainId: z.number().int().positive(),
  decimals: z.number().int().min(0),
  name: z.literal("").or(z.string().nonempty()),
  symbol: z.literal("").or(z.string().nonempty()),
  logoURI: z.string().url().nullable(),
});

const tokenWithCaip19IdSchema = tokenSchema.extend({
  caip19: ERC20Caip19Schema,
});

type ERC20Token = z.infer<typeof tokenWithCaip19IdSchema>;

const tokenListSchema = z.object({
  tokens: z.array(tokenSchema),
});

export class ERC20TokensService extends DataLoader<"", ERC20Token[]> {
  private listPromise: Promise<ERC20Token[]> = Promise.resolve([]);

  constructor() {
    super(async (queries) => {
      try {
        const list = await this.listPromise;

        return queries.map(() => {
          return list;
        });
      } catch (e) {
        console.error("ERC20TokensService: Failed to load list", {
          error: e,
        });

        return queries.map(() => []);
      }
    });

    this.listPromise = this.loadList();
  }

  private async loadList(): Promise<ERC20Token[]> {
    const tokenListResponse = await fetch("http://tokens.1inch.eth.link");

    if (!tokenListResponse.ok) {
      console.error(
        "Failed to fetch token list, the ERC20TokensService will not work",
        {
          status: tokenListResponse.status,
          body: await tokenListResponse.text(),
        },
      );

      return [];
    }

    const tokenList = await tokenListResponse.json();

    return z.array(tokenWithCaip19IdSchema).parse(
      tokenListSchema.parse(tokenList).tokens.map((token) => ({
        ...token,
        caip19: `eip155:${token.chainId}/erc20:${token.address}`,
      })),
    );
  }
}

export const erc20TokensService = new ERC20TokensService();
