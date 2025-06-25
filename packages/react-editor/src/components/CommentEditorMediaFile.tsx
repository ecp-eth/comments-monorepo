import type {
  UploadTrackerFileComponent,
  UploadTrackerFileComponentProps,
} from "../types.js";
import { CommentMediaFile } from "@ecp.eth/shared/components";

export const CommentEditorMediaFile: UploadTrackerFileComponent = ({
  file,
}: UploadTrackerFileComponentProps) => {
  return (
    <CommentMediaFile
      url={"url" in file ? file.url : undefined}
      name={file.name}
    />
  );
};

CommentEditorMediaFile.displayName = "CommentEditorMediaFile";
