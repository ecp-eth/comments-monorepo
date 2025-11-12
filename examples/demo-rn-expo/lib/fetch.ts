import { z, ZodSchema } from "zod";
import { publicEnv } from "../env";
import {
  RateLimitError,
  throwResponseError,
  throwResponseSchemaError,
} from "./errors";

/**
 * Wrapped fetch that prepends the API base URL to the pathname
 * @param pathname
 * @param options
 * @returns
 */
export const fetchAPI = async <T extends ZodSchema>(
  pathname: string,
  options: RequestInit,
  jsonSchema: T,
): Promise<z.infer<T>> => {
  const url = new URL(pathname, publicEnv.EXPO_PUBLIC_SIGNER_API_URL);
  console.log("fetching", url.toString());
  const res = await fetch(url, options);

  console.log("response", res.status, await res.clone().text());

  if (!res.ok) {
    if (res.status === 429) {
      throw new RateLimitError();
    }

    await throwResponseError(res);
  }

  const parsed = jsonSchema.safeParse(await res.json());

  if (!parsed.success) {
    throwResponseSchemaError(parsed.error);
  }

  return parsed.data;
};
