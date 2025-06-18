import type { FarcasterName } from "./farcaster.types";

export function constructFname(username: string): FarcasterName {
  return `${username}.fcast.id`;
}

export function isFarcasterFname(name: string): name is FarcasterName {
  return name.match(/\.fcast\.id$/i) !== null;
}

export function extractFarcasterName(name: string): string {
  if (isFarcasterFname(name)) {
    return name.replace(/\.fcast\.id$/i, "");
  }

  return name;
}
