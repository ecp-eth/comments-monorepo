import type {
  IndexerAPICommentReferencesSchemaType,
  IndexerAPICommentReferenceENSSchemaType,
  IndexerAPICommentReferenceERC20SchemaType,
  IndexerAPICommentReferenceFarcasterSchemaType,
  IndexerAPICommentReferenceSchemaType,
} from "@ecp.eth/sdk/indexer";
import type { CommentSelectType } from "ponder:schema";
import type { Hex } from "viem";
import type { ENSByAddressResolver } from "../resolvers/ens-by-address-resolver";
import type { ENSByNameResolver } from "../resolvers/ens-by-name-resolver";
import type { FarcasterByAddressResolver } from "../resolvers/farcaster-by-address-resolver";
import type { ERC20ByTickerResolver } from "../resolvers/erc20-by-ticker-resolver";
import type { ERC20ByAddressResolver } from "../resolvers/erc20-by-address-resolver";

type Options = {
  ensByAddressResolver: ENSByAddressResolver;
  ensByNameResolver: ENSByNameResolver;
  farcasterByAddressResolver: FarcasterByAddressResolver;
  erc20ByTickerResolver: ERC20ByTickerResolver;
  erc20ByAddressResolver: ERC20ByAddressResolver;
};

/**
 * This function resolves eth addresses, ens names and tickers (ERC20 symbols)
 * to their corresponding data.
 *
 * It also resolves the position of the reference in the comment.
 *
 * @param comment - The comment to resolve references for.
 * @returns The resolved references.
 */
export async function resolveCommentReferences(
  comment: Pick<CommentSelectType, "content" | "chainId">,
  options: Options,
): Promise<{
  references: IndexerAPICommentReferencesSchemaType;
  status: CommentSelectType["referencesResolutionStatus"];
}> {
  const promises: Promise<IndexerAPICommentReferenceSchemaType | null>[] = [];

  let pos = 0;

  while (pos < comment.content.length) {
    const restOfContent = comment.content.slice(pos);

    let match = restOfContent.match(ETH_ADDRESS_REGEX);

    if (match) {
      const position = { start: pos, end: pos + match[0].length };

      promises.push(
        resolveEthAddress(match[0] as Hex, comment.chainId, position, options),
      );
      pos += match[0].length;

      continue;
    }

    match = restOfContent.match(ENS_NAME_REGEX);

    if (match) {
      const position = { start: pos, end: pos + match[0].length };

      promises.push(resolveEnsName(match[1] as string, position, options));
      pos += match[0].length;

      continue;
    }

    match = restOfContent.match(ERC20_TICKER_REGEX);

    if (match) {
      const position = { start: pos, end: pos + match[0].length };

      promises.push(
        resolveERC20Ticker(
          match[1] as string,
          comment.chainId,
          position,
          options,
        ),
      );
      pos += match[0].length;

      continue;
    }

    pos += 1;
  }

  const results = await Promise.allSettled(promises);
  const references: IndexerAPICommentReferencesSchemaType = [];
  const count = promises.length;
  let resolved = 0;
  let failed = 0;

  for (const result of results) {
    if (result.status === "fulfilled") {
      resolved++;

      if (result.value) {
        references.push(result.value);
      }
    } else {
      failed++;
    }
  }

  let status: CommentSelectType["referencesResolutionStatus"] = "partial";

  if (failed === count) {
    status = "failed";
  } else if (resolved === count) {
    status = "success";
  }

  return {
    references,
    status,
  };
}

type ResolverPosition = {
  start: number;
  end: number;
};

const ETH_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}/;
const ENS_NAME_REGEX = /^@([a-zA-Z0-9.-]+\.eth)/;
const ERC20_TICKER_REGEX = /^\$([a-zA-Z0-9.-]+)/;

async function resolveEthAddress(
  address: Hex,
  chainId: number,
  position: ResolverPosition,
  {
    ensByAddressResolver,
    erc20ByAddressResolver,
    farcasterByAddressResolver,
  }: Options,
): Promise<
  | IndexerAPICommentReferenceENSSchemaType
  | IndexerAPICommentReferenceERC20SchemaType
  | IndexerAPICommentReferenceFarcasterSchemaType
  | null
> {
  const ensData = await ensByAddressResolver.load(address);

  if (ensData) {
    return {
      type: "ens",
      name: ensData.name,
      address,
      avatarUrl: ensData.avatarUrl,
      position,
    };
  }

  const farcasterData = await farcasterByAddressResolver.load(address);

  if (farcasterData) {
    return {
      type: "farcaster",
      displayName: farcasterData.displayName ?? null,
      fid: farcasterData.fid,
      pfpUrl: farcasterData.pfpUrl ?? null,
      username: farcasterData.username ?? null,
      position,
    };
  }

  const erc20Data = await erc20ByAddressResolver.load([address, chainId]);

  if (erc20Data) {
    return {
      type: "erc20",
      ...erc20Data,
      position,
    };
  }

  return null;
}

async function resolveEnsName(
  name: string,
  position: ResolverPosition,
  { ensByNameResolver }: Options,
): Promise<IndexerAPICommentReferenceENSSchemaType | null> {
  const result = await ensByNameResolver.load(name);

  if (result) {
    return {
      type: "ens",
      address: result.address,
      avatarUrl: result.avatarUrl,
      name: result.name,
      position,
    };
  }

  return null;
}

async function resolveERC20Ticker(
  ticker: string,
  chainId: number,
  position: ResolverPosition,
  { erc20ByTickerResolver }: Options,
): Promise<IndexerAPICommentReferenceERC20SchemaType | null> {
  const result = await erc20ByTickerResolver.load([ticker, chainId]);

  if (result) {
    return {
      type: "erc20",
      symbol: result.symbol,
      address: result.address,
      name: result.name,
      position,
      logoURI: result.logoURI,
    };
  }

  return null;
}
