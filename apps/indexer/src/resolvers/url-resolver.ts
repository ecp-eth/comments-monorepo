import type {
  IndexerAPICommentReferenceURLFileSchemaType,
  IndexerAPICommentReferenceURLImageSchemaType,
  IndexerAPICommentReferenceURLVideoSchemaType,
  IndexerAPICommentReferenceURLWebPageSchemaType,
} from "@ecp.eth/sdk/indexer/schemas";
import DataLoader from "dataloader";
import { parse as parseHTML } from "node-html-parser";

export type ResolvedURL =
  | Omit<IndexerAPICommentReferenceURLImageSchemaType, "position">
  | Omit<IndexerAPICommentReferenceURLVideoSchemaType, "position">
  | Omit<IndexerAPICommentReferenceURLFileSchemaType, "position">
  | Omit<IndexerAPICommentReferenceURLWebPageSchemaType, "position">;

export type URLResolver = DataLoader<string, ResolvedURL | null>;

function normalizeContentType(contentType: string | null): string | null {
  if (!contentType) {
    return null;
  }

  const [type] = contentType.split(";");
  const normalizedType = type?.trim().toLowerCase();

  return normalizedType || null;
}

async function resolveURL(
  url: string,
  timeout: number,
): Promise<ResolvedURL | null> {
  const response = await fetch(url, { signal: AbortSignal.timeout(timeout) });
  const contentType =
    normalizeContentType(response.headers.get("content-type")) ||
    "application/octet-stream";

  // in case the url was redirected this is the final url
  const finalUrl = response.url;

  if (!response.ok) {
    console.warn("Failed to fetch URL", url, response.statusText);
    return null;
  }

  // we don't do any sophisticated check of actual content type
  if (contentType.startsWith("video/")) {
    return {
      type: "video",
      mediaType: contentType,
      url: finalUrl,
    };
  }

  if (contentType.startsWith("image/")) {
    return {
      type: "image",
      mediaType: contentType,
      url: finalUrl,
    };
  }

  if (contentType === "text/html") {
    return resolveWebPage(response);
  }

  return {
    type: "file",
    url: finalUrl,
    mediaType: contentType,
  };
}

async function resolveWebPage(
  response: Response,
): Promise<Omit<
  IndexerAPICommentReferenceURLWebPageSchemaType,
  "position"
> | null> {
  const html = parseHTML(await response.text());

  let title = html.querySelector("title")?.text?.trim() ?? null;
  let description =
    html
      .querySelector("meta[name='description']")
      ?.getAttribute("content")
      ?.trim() ?? null;
  const favicon =
    html.querySelector("link[rel='icon']")?.getAttribute("href") ?? null;

  const ogTitle = html
    .querySelector("meta[property='og:title']")
    ?.getAttribute("content");
  const ogDescription = html
    .querySelector("meta[property='og:description']")
    ?.getAttribute("content");
  const ogImage = html
    .querySelector("meta[property='og:image']")
    ?.getAttribute("content");
  const ogUrl = html
    .querySelector("meta[property='og:url']")
    ?.getAttribute("content");

  // according to specification, title + image + url + type are required
  // we don't care about the type so we check only those three, if those aren't present
  // then we treat the og as non existent
  let opengraph:
    | IndexerAPICommentReferenceURLWebPageSchemaType["opengraph"]
    | null = null;

  if (ogTitle && ogImage && ogUrl) {
    opengraph = {
      title: ogTitle.trim(),
      description: ogDescription?.trim() ?? null,
      image: ogImage,
      url: ogUrl,
    };
  }

  title = title?.trim() ?? opengraph?.title ?? null;
  description = description?.trim() ?? opengraph?.description ?? null;

  if (!title) {
    return null;
  }

  return {
    type: "webpage",
    url: response.url,
    opengraph,
    title,
    description,
    favicon: favicon ? resolveFaviconUrl(favicon, response.url) : null,
  };
}

function resolveFaviconUrl(href: string, pageUrl: string): string {
  if (URL.canParse(href)) {
    return href;
  }

  return new URL(href, pageUrl).toString();
}

type URLResolverOptions = Omit<
  DataLoader.Options<string, ResolvedURL | null>,
  "batchLoadFn"
> & {
  /**
   * @default 5000
   */
  timeout?: number;
};

export function createURLResolver({
  timeout = 5000,
  ...dataLoaderOptions
}: URLResolverOptions = {}): URLResolver {
  return new DataLoader<string, ResolvedURL | null>(
    async (urls) => {
      return Promise.all(urls.map((url) => resolveURL(url, timeout)));
    },
    {
      maxBatchSize: 5,
      ...dataLoaderOptions,
    },
  );
}
