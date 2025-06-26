import type {
  UploadTrackerVideoComponent,
  UploadTrackerVideoComponentProps,
} from "../types.js";
import { CommentMediaVideo } from "@ecp.eth/shared/components";

export const CommentEditorMediaVideo: UploadTrackerVideoComponent = ({
  file,
}: UploadTrackerVideoComponentProps) => {
  return <CommentMediaVideo fileOrUrl={"url" in file ? file.url : file.file} />;
};

CommentEditorMediaVideo.displayName = "CommentEditorMediaVideo";
