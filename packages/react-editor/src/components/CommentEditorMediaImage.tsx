import type {
  UploadTrackerImageComponent,
  UploadTrackerImageComponentProps,
} from "../types.js";
import { CommentMediaImage } from "@ecp.eth/shared/components";

export const CommentEditorMediaImage: UploadTrackerImageComponent = ({
  file,
}: UploadTrackerImageComponentProps) => {
  return (
    <CommentMediaImage
      fileOrUrl={"url" in file ? file.url : file.file}
      alt={file.name}
    />
  );
};

CommentEditorMediaImage.displayName = "CommentEditorMediaImage";
