import { publicEnv } from "@/publicEnv";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { AuthorType } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatAuthorLink(author: AuthorType): string | null {
  if (!publicEnv.NEXT_PUBLIC_COMMENT_AUTHOR_URL) {
    return null;
  }

  const url = publicEnv.NEXT_PUBLIC_COMMENT_AUTHOR_URL.replace(
    "{address}",
    author.address
  );

  return URL.canParse(url) ? url : null;
}
