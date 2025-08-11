import { publicEnv } from "@/publicEnv";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatAuthorLinkWithTemplate } from "@ecp.eth/shared/helpers";
import { AuthorType } from "@ecp.eth/shared/types";
import { EmbedConfigSchemaInputType } from "@ecp.eth/sdk/embed/schemas";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatAuthorLink(author: AuthorType): string | null {
  return formatAuthorLinkWithTemplate(
    author,
    publicEnv.NEXT_PUBLIC_COMMENT_AUTHOR_URL,
  );
}

export function getAppSignerAddress(app: EmbedConfigSchemaInputType["app"]) {
  return app === "embed"
    ? publicEnv.NEXT_PUBLIC_APP_SIGNER_ADDRESS
    : app === "all"
      ? undefined
      : app;
}
