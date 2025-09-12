import { publicEnv } from "@/env/public";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function createFetchUrl(path: string): URL {
  return new URL(path, publicEnv.NEXT_PUBLIC_INDEXER_URL);
}
