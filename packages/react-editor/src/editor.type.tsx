import {
  type Editor as TipTapEditor,
  type JSONContent,
  type EditorEvents,
} from "@tiptap/react";

import {
  type UploadTrackerUploadedFile,
  type UploadTrackerFileToUpload,
} from "./extensions/upload-tracker.js";

import type { IndexerAPICommentReferencesSchemaType } from "@ecp.eth/sdk/indexer";
import type {
  MentionsExtensionTheme,
  UploadTrackerFileComponent,
  UploadTrackerImageComponent,
  UploadTrackerVideoComponent,
} from "./extensions/types.js";

import type { EditorSuggestionsService, UploadFilesService } from "./types.js";

export type EditorRef = {
  focus: () => void;
  /**
   * Clears the editor content
   */
  clear: () => void;
  editor: TipTapEditor | null;
  getDefaultContent: () => JSONContent;
  getUploadedFiles: () => UploadTrackerUploadedFile[];
  getFilesForUpload: () => UploadTrackerFileToUpload[];
  setFileAsUploaded: (file: UploadTrackerUploadedFile) => void;
  setFileUploadAsFailed: (fileId: string) => void;
  addFiles: (files: File[]) => void;
};

export type EditorProps = {
  className?: string;
  wrapperClassName?: string;
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
  onCreate?: (props: EditorEvents["create"]) => void;
  onUpdate?: (props: EditorEvents["update"]) => void;
  onBlur?: (props: EditorEvents["blur"]) => void;
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
};

export type MessageFromWebView =
  | {
      type: "webview-ready";
    }
  | {
      type: "log";
      message: string;
    };

export type MessageFromNative = {
  type: "set-editor-props";
  props: EditorProps;
};
