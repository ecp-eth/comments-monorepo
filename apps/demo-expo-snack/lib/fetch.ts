import { publicEnv } from "../env";

/**
 * Wrapped fetch that prepends the API base URL to the pathname
 * @param pathname
 * @param options
 * @returns
 */
export const fetchAPI = async (pathname: string, options: RequestInit) => {
  const url = new URL(pathname, publicEnv.EXPO_PUBLIC_API_URL);
  console.log("fetching", url.toString());
  const res = await fetch(url, options);
  console.log("response", res.status);
  return res;
};
