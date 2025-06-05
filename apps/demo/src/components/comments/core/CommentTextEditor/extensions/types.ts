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
