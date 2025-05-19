import crypto from "crypto";

interface GenerateHMACParamsOptions {
  secret: string;
  queryParams?: Record<string, string> | URLSearchParams;
  body?: string;
}

/**
 * Generates query parameters required for HMAC authentication
 * @param options Configuration options including secret key and optional query parameters
 * @returns Object containing all query parameters including signature and timestamp
 */
export function generateHMACParams({
  secret,
  queryParams = {},
  body = "",
}: GenerateHMACParamsOptions): URLSearchParams {
  const timestamp = Math.floor(Date.now() / 1000).toString();

  // Create a copy of query parameters to avoid mutating the input
  const params = new URLSearchParams(queryParams);

  // Sort query parameters to ensure consistent ordering
  const sortedQueryString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  // Calculate HMAC signature
  const hmac = crypto.createHmac("sha256", secret);
  const calculatedSignature = hmac
    .update(sortedQueryString)
    .update("|") // Separator between query params and body
    .update(body)
    .digest("hex");

  params.set("signature", calculatedSignature);
  params.set("timestamp", timestamp);

  return params;
}

/**
 * Generates a complete URL with HMAC authentication parameters
 * @param baseUrl The base URL to append parameters to
 * @param options Configuration options including secret key and optional query parameters
 * @returns Complete URL with all necessary HMAC parameters
 */
export function generateHMACUrl(
  baseUrl: string | URL,
  options: GenerateHMACParamsOptions,
): URL {
  const url = new URL(baseUrl);

  // merge query params from url with query params from options
  const queryParams = new URLSearchParams(url.searchParams);
  const queryParamsFromOptions = new URLSearchParams(options.queryParams);

  queryParamsFromOptions.forEach((value, key) => {
    queryParams.set(key, value);
  });

  const newQueryParams = generateHMACParams({
    ...options,
    queryParams,
  });

  const signedUrl = new URL(url.pathname, url);

  newQueryParams.forEach((value, key) => {
    signedUrl.searchParams.set(key, value);
  });

  return signedUrl;
}
