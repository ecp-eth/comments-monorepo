import { publicEnv } from "@/publicEnv";
import { formatAuthorLinkWithTemplate } from "@ecp.eth/shared/helpers";
import { AuthorType } from "@ecp.eth/shared/types";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatAuthorLink(author: AuthorType) {
  return formatAuthorLinkWithTemplate(
    author,
    publicEnv.NEXT_PUBLIC_COMMENT_AUTHOR_URL,
  );
}

export function getSignerURL(path: string) {
  const url = new URL(path, publicEnv.NEXT_PUBLIC_SIGNER_API_URL);
  return url.toString();
}
