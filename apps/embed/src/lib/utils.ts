import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(timestamp: number | Date): string {
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

  // implement content negotiation and use the Accept-Language header to determine the locale
  // for now, we only support English since the UI is not translated
  return new Intl.RelativeTimeFormat("en-US", { numeric: "auto" }).format(
    diffInDays,
    "day"
  );
}

export function bigintReplacer(key: string, value: unknown) {
  if (typeof value === "bigint") {
    return value.toString();
  }
  return value;
}

export function abbreviateAddressForDisplay(address: string): string {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
