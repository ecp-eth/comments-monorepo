import type { Hex } from "@ecp.eth/sdk/core";
import type { Attribute } from "@tiptap/core";

export type UploadTrackerFileToUpload = {
  id: string;
  name: string;
  // this wasn't uploaded yet, it's a file that the user selected
  file: File;
  mimeType: string;
};

export type UploadTrackerUploadedFile = {
  id: string;
  name: string;
  url: string;
  mimeType: string;
};

export type UploadTrackerFile =
  | UploadTrackerFileToUpload
  | UploadTrackerUploadedFile;

export type UploadTrackerAttributes = {
  uploads: UploadTrackerFile[];
};

export type LinkAttributes = {
  class: "underline cursor-pointer";
  href: string;
  rel: "noopener noreferrer";
  target: "_blank";
};

export type EnsMentionSuggestion = {
  type: "ens";
  address: Hex;
  name: string;
  avatarUrl: string | null;
  url: string;
};

export type Erc20MentionSuggestion = {
  type: "erc20";
  name: string;
  symbol: string;
  address: Hex;
  caip19: string;
  chainId: number;
  decimals: number;
  logoURI: string | null;
};

export type FarcasterMentionSuggestion = {
  type: "farcaster";
  address: Hex;
  fid: number;
  fname: string;
  displayName?: string | null;
  username: string;
  pfpUrl?: string | null;
  url: string;
};

export type MentionItem =
  | EnsMentionSuggestion
  | Erc20MentionSuggestion
  | FarcasterMentionSuggestion;

export type MentionItemKeys =
  | keyof EnsMentionSuggestion
  | keyof Erc20MentionSuggestion
  | keyof FarcasterMentionSuggestion;

export type MentionAttributes = {
  [K in MentionItemKeys]: Attribute;
};
