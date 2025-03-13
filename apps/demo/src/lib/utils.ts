import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function abbreviateAddressForDisplay(address: string): string {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatDate(timestamp: number | Date | string): string {
  const date = new Date(timestamp);
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateRelative(timestamp: number | Date): string {
  const date = new Date(timestamp);
  const diffInMs = date.getTime() - Date.now();
  const diffInDays = Math.round(diffInMs / (1000 * 60 * 60 * 24));

  return new Intl.RelativeTimeFormat("en-US", { numeric: "auto" }).format(
    diffInDays,
    "day"
  );
}

/**
 * Used as a JSON replacer to convert BigInts to strings
 * @param key
 * @param value
 * @returns
 */
export function bigintReplacer(key: string, value: unknown) {
  if (typeof value === "bigint") {
    return value.toString();
  }
  return value;
}
