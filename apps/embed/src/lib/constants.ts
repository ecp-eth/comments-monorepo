export const MAX_COMMENT_LENGTH = 1000;
export const COMMENTS_PER_PAGE = 10;
export const MAX_INITIAL_REPLIES_ON_PARENT_COMMENT = 3;
export const NEW_COMMENTS_BY_AUTHOR_CHECK_INTERVAL = 60000; // 1 minute
export const NEW_COMMENTS_CHECK_INTERVAL = 30000; // 30 seconds
export const TX_RECEIPT_TIMEOUT = 1000 * 60 * 2; // 2 minutes
export const COMMENT_REACTION_LIKE_CONTENT = "like";
export const ALLOWED_UPLOAD_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "video/mp4",
  "video/webm",
  "video/avi",
  "video/quicktime", // for .mov files
];
export const MAX_UPLOAD_FILE_SIZE = 1024 * 1024 * 10; // 10MB
