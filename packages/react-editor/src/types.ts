import type {
  SearchSuggestionsFunction,
  UploadTrackerFileToUpload,
  UploadTrackerUploadedFile,
} from "./extensions/types.js";

export * from "./extensions/types.js";

export type EditorSuggestionsService = {
  search: SearchSuggestionsFunction;
};

type UploadFilesServiceCallbacks<TUploadResponse = unknown> = {
  onError?: (uploadedFileId: string, error: Error) => void;
  onSuccess?: (
    uploadedFile: UploadTrackerUploadedFile,
    response: TUploadResponse,
  ) => void;
};

export type UploadFilesService<TUploadResponse = unknown> = {
  readonly allowedMimeTypes: readonly string[];
  readonly maxFileSize: number;
  uploadFile: (
    file: UploadTrackerFileToUpload,
    callbacks?: UploadFilesServiceCallbacks<TUploadResponse>,
  ) => Promise<TUploadResponse>;
  uploadFiles: (
    files: UploadTrackerFileToUpload[],
    callbacks?: UploadFilesServiceCallbacks<TUploadResponse>,
  ) => Promise<TUploadResponse[]>;
};
