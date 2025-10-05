import {
  type IndexerAPICommentReferencesSchemaType,
  type IndexerAPICommentReferenceENSSchemaType,
  type IndexerAPICommentReferenceERC20SchemaType,
  type IndexerAPICommentReferenceFarcasterSchemaType,
  type IndexerAPICommentReferenceSchemaType,
  IndexerAPICommentReferenceENSSchema,
  IndexerAPICommentReferenceFarcasterSchema,
  IndexerAPICommentReferenceERC20Schema,
  IndexerAPICommentReferenceURLFileSchema,
  IndexerAPICommentReferenceURLImageSchema,
  IndexerAPICommentReferenceURLVideoSchema,
  IndexerAPICommentReferenceURLWebPageSchema,
} from "@ecp.eth/sdk/indexer";
import type { CommentSelectType } from "../../ponder.schema.ts";
import type { Hex } from "viem";
import z from "zod";
import {
  type ENSByAddressResolver,
  type ENSByNameResolver,
  type FarcasterByAddressResolver,
  type ERC20ByTickerResolver,
  type ERC20ByAddressResolver,
  type HTTPResolver,
  type FarcasterByNameResolver,
  type FarcasterName,
  HTTP_URL_REGEX,
} from "../resolvers/index.ts";
import {
  IPFS_URL_REGEX,
  type IPFSResolver,
} from "../resolvers/ipfs-resolver.ts";

export type ResolveCommentReferencesOptions = {
  ensByAddressResolver: ENSByAddressResolver;
  ensByNameResolver: ENSByNameResolver;
  farcasterByAddressResolver: FarcasterByAddressResolver;
  farcasterByNameResolver: FarcasterByNameResolver;
  erc20ByTickerResolver: ERC20ByTickerResolver;
  erc20ByAddressResolver: ERC20ByAddressResolver;
  httpResolver: HTTPResolver;
  ipfsResolver: IPFSResolver;
};

type ResolveCommentReferenceStatus = "success" | "partial" | "failed";

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
  options: ResolveCommentReferencesOptions,
): Promise<{
  references: IndexerAPICommentReferencesSchemaType;
  status: ResolveCommentReferenceStatus;
  allResolvedPositions: ResolveCommentReferencePosition[];
}> {
  const promises: Promise<IndexerAPICommentReferenceSchemaType | null>[] = [];

  let pos = 0;

  const content = comment.content;
  const allResolvedPositions: ResolveCommentReferencePosition[] = [];

  while (pos < content.length) {
    const restOfContent = content.slice(pos);

    let match = restOfContent.match(ETH_ADDRESS_REGEX);

    if (match) {
      const position = { start: pos, end: pos + match[0].length };
      const address = match[0].startsWith("@") ? match[0].slice(1) : match[0];

      promises.push(resolveEthAddress(address as Hex, position, options));
      allResolvedPositions.push(position);
      pos += match[0].length;

      continue;
    }

    match = restOfContent.match(ERC20_TOKEN_ETH_ADDRESS_REGEX);

    if (match) {
      const position = { start: pos, end: pos + match[0].length };
      const address = match[0].slice(1);

      promises.push(
        resolveERC20TokenEthAddress(
          address as Hex,
          undefined,
          position,
          options,
        ),
      );
      allResolvedPositions.push(position);
      pos += match[0].length;

      continue;
    }

    match = restOfContent.match(ENS_NAME_REGEX);

    if (match) {
      const position = { start: pos, end: pos + match[0].length };
      const ensName = match[0].startsWith("@") ? match[0].slice(1) : match[0];

      promises.push(resolveEnsName(ensName, position, options));
      allResolvedPositions.push(position);
      pos += match[0].length;

      continue;
    }

    match = restOfContent.match(FARCASTER_FNAME_REGEX);

    if (match) {
      const position = { start: pos, end: pos + match[0].length };
      const fname = match[0].startsWith("@") ? match[0].slice(1) : match[0];

      promises.push(
        resolveFarcasterFname(fname as FarcasterName, position, options),
      );
      allResolvedPositions.push(position);
      pos += match[0].length;
    }

    match = restOfContent.match(ERC_20_CAIP_19_REGEX);

    if (match) {
      const position = { start: pos, end: pos + match[0].length };
      const address = match[2] as Hex;
      const chainId = Number(match[1]);

      promises.push(
        resolveERC20TokenEthAddress(address, chainId, position, options),
      );
      allResolvedPositions.push(position);

      pos += match[0].length;

      continue;
    }

    match = restOfContent.match(ERC20_TOKEN_TICKER_REGEX);

    if (match) {
      const position = { start: pos, end: pos + match[0].length };

      promises.push(
        resolveERC20TokenTicker(
          match[0].slice(1),
          comment.chainId,
          position,
          options,
        ),
      );
      allResolvedPositions.push(position);
      pos += match[0].length;

      continue;
    }

    match = restOfContent.match(IPFS_URL_REGEX);

    if (match) {
      const position = { start: pos, end: pos + match[0].length };

      promises.push(resolveIPFS(match[0], position, options));
      allResolvedPositions.push(position);
      pos += match[0].length;

      continue;
    }

    match = restOfContent.match(HTTP_URL_REGEX);

    if (match) {
      const position = { start: pos, end: pos + match[0].length };

      promises.push(resolveURL(match[0], position, options));
      allResolvedPositions.push(position);
      pos += match[0].length;

      continue;
    }

    const codePoint = content.codePointAt(pos);
    pos += codePoint != null && codePoint > 0xffff ? 2 : 1;
  }

  const results = await Promise.allSettled(promises);
  const references: IndexerAPICommentReferencesSchemaType = [];
  const count = promises.length;
  let resolved = 0;
  let failed = 0;

  for (const result of results) {
    if (result.status === "fulfilled") {
      resolved++;

      // some resolvers returns null to indicate resolution succeed but no useful info found
      if (result.value) {
        references.push(result.value);
      }
    } else {
      failed++;
    }
  }

  let status: ResolveCommentReferenceStatus = "partial";

  if (resolved === count) {
    status = "success";
  } else if (failed === count) {
    status = "failed";
  }

  return {
    references,
    status,
    allResolvedPositions,
  };
}

export type ResolveCommentReferencePosition = {
  start: number;
  end: number;
};

/**
 * Can be any entity on a chain so make sure you resolve it properly
 */
const ETH_ADDRESS_REGEX = /^@?0x[a-fA-F0-9]{40}/u;
/**
 * This one is an address that should probably point only to erc20 token
 */
const ERC20_TOKEN_ETH_ADDRESS_REGEX = /^\$0x[a-fA-F0-9]{40}/u;
/**
 * Handles ens name or ens name mention
 */
const ENS_NAME_REGEX = /^@?[a-zA-Z0-9.-]+\.eth/iu;
/**
 * Handles farcaster fname
 */
const FARCASTER_FNAME_REGEX = /^@?[a-zA-Z0-9.-]+\.fcast\.id/iu;
/**
 * Handles erc20 symbol
 */
const ERC20_TOKEN_TICKER_REGEX = /^\$[a-zA-Z0-9.-]+/u;
/**
 * Handles erc20 caip19 url
 */
const ERC_20_CAIP_19_REGEX =
  /^(?:\$|@)?eip155:([0-9]+)\/erc20:(0x[a-fA-F0-9]{40})/u;

async function resolveEthAddress(
  address: Hex,
  position: ResolveCommentReferencePosition,
  options: ResolveCommentReferencesOptions,
): Promise<
  | IndexerAPICommentReferenceENSSchemaType
  | IndexerAPICommentReferenceERC20SchemaType
  | IndexerAPICommentReferenceFarcasterSchemaType
  | null
> {
  const { ensByAddressResolver, farcasterByAddressResolver } = options;
  const ensData = await ensByAddressResolver.load(address);

  if (ensData) {
    return (
      IndexerAPICommentReferenceENSSchema.safeParse({
        type: "ens",
        name: ensData.name,
        address,
        avatarUrl: ensData.avatarUrl,
        position,
        url: ensData.url,
      } satisfies IndexerAPICommentReferenceENSSchemaType).data ?? null
    );
  }

  const farcasterData = await farcasterByAddressResolver.load(address);

  if (farcasterData) {
    return (
      IndexerAPICommentReferenceFarcasterSchema.safeParse({
        type: "farcaster",
        address,
        displayName: farcasterData.displayName ?? null,
        fid: farcasterData.fid,
        fname: farcasterData.fname,
        pfpUrl: farcasterData.pfpUrl ?? null,
        username: farcasterData.username,
        url: farcasterData.url,
        position,
      } satisfies IndexerAPICommentReferenceFarcasterSchemaType).data ?? null
    );
  }

  return resolveERC20TokenEthAddress(address, undefined, position, options);
}

async function resolveERC20TokenEthAddress(
  address: Hex,
  /**
   * If passed this means that user selected specific token on specific chain
   * or we parsed caip19.
   */
  chainId: number | undefined,
  position: ResolveCommentReferencePosition,
  { erc20ByAddressResolver }: ResolveCommentReferencesOptions,
): Promise<IndexerAPICommentReferenceERC20SchemaType | null> {
  const result = await erc20ByAddressResolver.load(address);

  if (result) {
    return (
      IndexerAPICommentReferenceERC20Schema.safeParse({
        type: "erc20",
        ...result,
        chainId: chainId ?? null,
        position,
      } satisfies IndexerAPICommentReferenceERC20SchemaType).data ?? null
    );
  }

  return null;
}

async function resolveEnsName(
  name: string,
  position: ResolveCommentReferencePosition,
  { ensByNameResolver }: ResolveCommentReferencesOptions,
): Promise<IndexerAPICommentReferenceENSSchemaType | null> {
  const result = await ensByNameResolver.load(name);

  if (result) {
    return (
      IndexerAPICommentReferenceENSSchema.safeParse({
        type: "ens",
        address: result.address,
        avatarUrl: result.avatarUrl,
        name: result.name,
        position,
        url: result.url,
      } satisfies IndexerAPICommentReferenceENSSchemaType).data ?? null
    );
  }

  return null;
}

async function resolveFarcasterFname(
  fname: FarcasterName,
  position: ResolveCommentReferencePosition,
  { farcasterByNameResolver }: ResolveCommentReferencesOptions,
): Promise<IndexerAPICommentReferenceFarcasterSchemaType | null> {
  const result = await farcasterByNameResolver.load(fname);

  if (result) {
    return (
      IndexerAPICommentReferenceFarcasterSchema.safeParse({
        type: "farcaster",
        address: result.address,
        displayName: result.displayName ?? null,
        fid: result.fid,
        fname: result.fname,
        pfpUrl: result.pfpUrl ?? null,
        username: result.username,
        url: result.url,
        position,
      } as IndexerAPICommentReferenceFarcasterSchemaType).data ?? null
    );
  }

  return null;
}

async function resolveERC20TokenTicker(
  ticker: string,
  chainId: number,
  position: ResolveCommentReferencePosition,
  { erc20ByTickerResolver }: ResolveCommentReferencesOptions,
): Promise<IndexerAPICommentReferenceERC20SchemaType | null> {
  const result = await erc20ByTickerResolver.load([ticker, chainId]);

  if (result) {
    return (
      IndexerAPICommentReferenceERC20Schema.safeParse({
        type: "erc20",
        chainId,
        symbol: result.symbol,
        address: result.address,
        name: result.name,
        position,
        logoURI: result.logoURI,
        decimals: result.decimals,
        chains: result.chains,
      } satisfies IndexerAPICommentReferenceERC20SchemaType).data ?? null
    );
  }

  return null;
}

const ResolveURLResult = z.union([
  IndexerAPICommentReferenceURLFileSchema,
  IndexerAPICommentReferenceURLImageSchema,
  IndexerAPICommentReferenceURLVideoSchema,
  IndexerAPICommentReferenceURLWebPageSchema,
  z.null(),
]);

type ResolveURLResultType = z.output<typeof ResolveURLResult>;

async function resolveURL(
  url: string,
  position: ResolveCommentReferencePosition,
  { httpResolver }: ResolveCommentReferencesOptions,
): Promise<ResolveURLResultType> {
  const result = await httpResolver.load(url);

  if (result) {
    return (
      ResolveURLResult.safeParse({
        ...result,
        position,
      } satisfies ResolveURLResultType).data ?? null
    );
  }

  return null;
}

async function resolveIPFS(
  ipfsUrl: string,
  position: ResolveCommentReferencePosition,
  { ipfsResolver }: ResolveCommentReferencesOptions,
): Promise<ResolveURLResultType> {
  const result = await ipfsResolver.load(ipfsUrl);

  if (result) {
    return (
      ResolveURLResult.safeParse({
        ...result,
        position,
      } satisfies ResolveURLResultType).data ?? null
    );
  }

  return null;
}
