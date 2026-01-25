import type { ComponentType, CSSProperties } from "react";
import type { Attribute } from "@tiptap/core";
import type {
  IndexerAPIAutocompleteERC20SchemaType,
  IndexerAPIAutocompleteENSSchemaType,
  IndexerAPIAutocompleteFarcasterSchemaType,
  IndexerAPIAutocompleteSchemaType,
  IndexerAPIGetAutocompleteOutputSchemaType,
} from "@ecp.eth/sdk/indexer";

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
  class: string;
  href: string;
  rel: "noopener noreferrer";
  target: "_blank";
  style?: CSSProperties;
};

export type MentionItem = IndexerAPIAutocompleteSchemaType;

export type MentionItemKeys =
  | keyof IndexerAPIAutocompleteENSSchemaType
  | keyof IndexerAPIAutocompleteERC20SchemaType
  | keyof IndexerAPIAutocompleteFarcasterSchemaType;

export type MentionAttributes = {
  [K in MentionItemKeys]: Attribute;
};

export type UploadTrackerImageComponentProps = {
  file: UploadTrackerFile;
};

export type UploadTrackerImageComponent =
  ComponentType<UploadTrackerImageComponentProps>;

export type UploadTrackerVideoComponentProps = {
  file: UploadTrackerFile;
};

export type UploadTrackerVideoComponent =
  ComponentType<UploadTrackerVideoComponentProps>;

export type UploadTrackerFileComponentProps = {
  file: UploadTrackerFile;
};

export type UploadTrackerFileComponent =
  ComponentType<UploadTrackerFileComponentProps>;

export type SearchSuggestionsFunction = (
  query: string,
  char: "@" | "$",
) => Promise<IndexerAPIGetAutocompleteOutputSchemaType>;

export type MentionsExtensionTheme = {
  suggestionsClassName?: string;
  suggestionsNoResultsClassName?: string;
  suggestionsContinueTypingClassName?: string;
  suggestionsItemClassName?: string;
  suggestionsItemSelectedClassName?: string;
  suggestionsItemAvatarClassName?: string;
  suggestionsItemNameClassName?: string;
  suggestionsItemHandleClassName?: string;
  suggestionsItemInfoClassName?: string;
  suggestionsItemChainClassName?: string;
  suggestionsItemSymbolClassName?: string;
  suggestionsItemDecimalsClassName?: string;
};
