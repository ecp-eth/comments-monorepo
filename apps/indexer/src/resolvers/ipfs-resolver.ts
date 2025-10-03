import * as Sentry from "@sentry/node";
import type { PinataSDK } from "pinata";
import DataLoader from "dataloader";
import type { URLResolver, ResolvedURL } from "./url-resolver.ts";
import { runAsync } from "@ecp.eth/sdk/core";

export type IPFSResolver = DataLoader<string, ResolvedURL | null>;

/**
 * IPFS protocol URL pattern
 */
export const IPFS_URL_REGEX = /^ipfs:\/\/([a-zA-Z0-9]+)((?:\/[^\s]*)?)/u;

/**
 * Extract CID from IPFS protocol URL
 */
function extractCID(url: string): string | null {
  const ipfsMatch = url.match(IPFS_URL_REGEX);
  if (ipfsMatch && ipfsMatch[1]) {
    return ipfsMatch[1];
  }

  return null;
}

function extractResourcePath(ipfsUrl: string) {
  const ipfsMatch = ipfsUrl.match(IPFS_URL_REGEX);
  if (ipfsMatch && ipfsMatch[2]) {
    return ipfsMatch[2];
  }

  return "";
}

async function waitURLToBeReady(url: string) {
  await runAsync(
    async () => {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
      throw new Error("URL is not ready");
    },
    {
      retries: 3,
      backoff: {
        type: "exponential",
        delay: 300,
      },
    },
  );
}

/**
 * Pin a CID to Pinata and return the gateway URL
 */
async function pinCIDToPinata(
  cid: string,
  pinataSDK: PinataSDK,
): Promise<boolean> {
  try {
    // Pin the CID to Pinata
    const pinResult = await pinataSDK.upload.public.cid(cid);

    if (!pinResult) {
      console.warn("Failed to pin CID to Pinata:", cid);
      return false;
    }

    if (!pinataSDK.config?.pinataGateway) {
      return false;
    }

    return true;
  } catch (error) {
    console.error(`Error pinning CID ${cid} to Pinata:`, error);
    Sentry.captureException(error, {
      extra: {
        cid,
      },
    });
    return false;
  }
}

function constructFallbackURL(cid: string, resourcePath: string) {
  return "https://ipfs.io/ipfs/" + cid + resourcePath;
}

function constructGatewayURL(
  cid: string,
  resourcePath: string,
  pinataSDK: PinataSDK,
) {
  return `${pinataSDK.config?.pinataGateway}/ipfs/${cid}${resourcePath}`;
}

/**
 * Resolve an IPFS URL by pinning it to Pinata and then resolving metadata
 */
async function resolveIPFSURL(
  ipfsUrl: string,
  pinataSDK: PinataSDK,
  urlResolver: URLResolver,
): Promise<ResolvedURL | null> {
  const cid = extractCID(ipfsUrl);
  const resourcePath = extractResourcePath(ipfsUrl);

  if (!cid) {
    console.warn("Invalid IPFS URL format:", ipfsUrl);
    return null;
  }

  try {
    // Pin the CID to Pinata to get a gateway URL
    const pinned = await pinCIDToPinata(cid, pinataSDK);

    const resURL = pinned
      ? constructGatewayURL(cid, resourcePath, pinataSDK)
      : constructFallbackURL(cid, resourcePath);

    if (!resURL) {
      console.warn("Failed to pin CID to Pinata:", cid);
      return null;
    }

    // this is a workaround to wait for pinata pinned url to be ready
    // pinata can falsy return 403 when the url is not pinned yet,
    // which confuses the http url resolver
    await waitURLToBeReady(resURL);

    // Use the existing URL resolver to get metadata from the gateway URL
    const resolvedURL = await urlResolver.load(resURL);

    if (!resolvedURL) {
      console.warn("Failed to resolve metadata for IPFS content:", resURL);
      return null;
    }

    // Return the resolved URL with the original IPFS URL preserved
    return resolvedURL;
  } catch (error) {
    console.error("Error resolving IPFS URL:", ipfsUrl, error);
    // if we fail to pin or resolve, we should throw an error to indicate resolution failed
    throw error;
  }
}

type IPFSResolverOptions = Omit<
  DataLoader.Options<string, ResolvedURL | null>,
  "batchLoadFn"
> & {
  urlResolver: URLResolver;
  pinataSDK: PinataSDK;
};

/**
 * Create an IPFS resolver that pins CIDs to Pinata and resolves metadata
 */
export function createIPFSResolver({
  urlResolver,
  pinataSDK,
  ...dataLoaderOptions
}: IPFSResolverOptions): IPFSResolver {
  return new DataLoader<string, ResolvedURL | null>(
    async (ipfsUrls) => {
      return Promise.all(
        ipfsUrls.map((ipfsUrl) =>
          resolveIPFSURL(ipfsUrl, pinataSDK, urlResolver),
        ),
      );
    },
    {
      maxBatchSize: 3, // Smaller batch size for IPFS operations
      ...dataLoaderOptions,
    },
  );
}
