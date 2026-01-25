import {
  type Editor as TipTapEditor,
  type JSONContent,
  type EditorEvents,
} from "@tiptap/react";

import {
  type UploadTrackerUploadedFile,
  type UploadTrackerFileToUpload,
} from "./extensions/upload-tracker.js";

import type {
  IndexerAPICommentReferencesSchemaType,
  IndexerAPIGetAutocompleteOutputSchemaType,
} from "@ecp.eth/sdk/indexer";
import type {
  MentionItem,
  MentionsExtensionTheme,
  UploadTrackerFileComponent,
  UploadTrackerImageComponent,
  UploadTrackerVideoComponent,
} from "./extensions/types.js";

import type { EditorSuggestionsService, UploadFilesService } from "./types.js";

export type EditorRef = {
  getText: () => Promise<string>;
  focus: () => void;
  /**
   * Clears the editor content
   */
  clear: () => void;
  editor: TipTapEditor | null;
  getDefaultContent: () => Promise<JSONContent>;
  getUploadedFiles: () => Promise<UploadTrackerUploadedFile[]>;
  getFilesForUpload: () => Promise<UploadTrackerFileToUpload[]>;
  setFileAsUploaded: (file: UploadTrackerUploadedFile) => void;
  setFileUploadAsFailed: (fileId: string) => void;
  addFiles: (files: File[]) => void;
  dismissKeyboard: () => void;
};

/**
 * Editor theme
 */
export type EditorTheme = {
  /**
   * Full stylesheet text to be injected into the editor container window.
   */
  styleSheetText?: string;
  editorContainer?: {
    className?: string;
  };
  editorContainer_dropTarget?: {
    className?: string;
  };
  editor?: {
    className?: string;
  };
  editor_disabled?: {
    className?: string;
  };
  link?: {
    className?: string;
  };
  placeholder?: {
    className?: string;
  };
};

export type EditorProps = {
  disabled?: boolean;
  defaultValue?: {
    content: string;
    references: IndexerAPICommentReferencesSchemaType;
  };
  placeholder: string;
  /**
   * @default false
   */
  autoFocus?: boolean;
  ref?: React.Ref<EditorRef>;
  onCreate?: (props?: EditorEvents["create"]) => void;
  onUpdate?: (props?: EditorEvents["update"]) => void;
  onBlur?: (props?: EditorEvents["blur"]) => void;
  onEscapePress?: () => void;
  suggestions: EditorSuggestionsService;
  suggestionsTheme?: MentionsExtensionTheme;
  uploads: UploadFilesService;
  /**
   * @default CommentMediaImage
   */
  imageComponent?: UploadTrackerImageComponent;
  /**
   * @default CommentMediaVideo
   */
  videoComponent?: UploadTrackerVideoComponent;
  /**
   * @default CommentMediaFile
   */
  fileComponent?: UploadTrackerFileComponent;
  theme?: EditorTheme;
  ensRPC?: string;
};

/**
 * Methods expose from webview container to native container
 */
export interface IWebViewExposedCom extends EditorRef {
  setProps: (props: EditorProps) => void;
  getViewportHeight: () => number;
  invokeMentionCommand: (mentionItem: MentionItem) => void;
}

/**
 * Methods expose from native container to webview container
 */
export interface INativeExposedCom {
  setViewportHeight: (height: number) => void;
  log: (message: string) => void;
  onWebViewReady: () => void;
  onEditorCreated: () => void;
  onEditorUpdated: () => void;
  onEditorBlurred: () => void;
  onEditorEscapePressed: () => void;
  searchSuggestions: (
    query: string,
    char: "@" | "$",
  ) => Promise<IndexerAPIGetAutocompleteOutputSchemaType>;
  onMentionSuggestionStart: (props: INativeExposedComSuggestionProps) => void;
  onMentionSuggestionUpdate: (
    props: Omit<INativeExposedComSuggestionProps, "clientRect"> & {
      clientRect?: DOMRect;
    },
  ) => void;
  onMentionSuggestionExit: () => void;
}

export type INativeExposedComSuggestionProps = {
  items: MentionItem[];
  query: string;
  clientRect: DOMRect;
};
