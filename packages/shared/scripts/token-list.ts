import { z } from "zod";
import path from "path";
import { writeFile } from "fs/promises";

const tokenListResponse = await fetch(
  "https://wispy-bird-88a7.uniswap.workers.dev/?url=http://tokens.1inch.eth.link",
);

if (!tokenListResponse.ok) {
  throw new Error("Failed to fetch token list");
}

const tokenList = await tokenListResponse.json();

const tokenSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  chainId: z.number().int().positive(),
  decimals: z.number().int().min(0),
  name: z.literal("").or(z.string().nonempty()),
  symbol: z.literal("").or(z.string().nonempty()),
  logoURI: z.string().url().nullable(),
});

const tokenWithCaip19IdSchema = tokenSchema.extend({
  caip19: z.string().url(),
});

const tokenListSchema = z.object({
  tokens: z.array(tokenSchema),
});

const tokens = z.array(tokenWithCaip19IdSchema).parse(
  tokenListSchema.parse(tokenList).tokens.map((token) => ({
    ...token,
    caip19: `eip155:${token.chainId}/erc20:${token.address}`,
  })),
);

const outputPath = path.resolve(process.cwd(), "./src/token-list.ts");

await writeFile(
  outputPath,
  `export const tokenList = ${JSON.stringify(tokens, null, 2)};`,
);
