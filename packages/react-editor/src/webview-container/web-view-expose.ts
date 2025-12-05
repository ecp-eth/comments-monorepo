import { expose } from "comlink";
import { EditorProps, EditorRef, IWebViewExposedCom } from "../editor.type";
import { webViewMessageEventEndpoint } from "./native-wrap";
import { never } from "@ecp.eth/shared/helpers";
import { MentionItem, UploadTrackerUploadedFile } from "../types";

export const webViewComSharedContext: {
  editor?: EditorRef;
  command?: (command: MentionItem) => void;
  setEditorProps?: (props: EditorProps) => void;
} = {};

let isExposed = false;

export function exposeWebViewCom() {
  if (isExposed) {
    return;
  }
  isExposed = true;

  expose(
    {
      async getText() {
        return await (
          webViewComSharedContext.editor ?? never("editorRef is not ready")
        )?.getText();
      },
      focus() {
        webViewComSharedContext.editor?.focus();
      },
      clear() {
        webViewComSharedContext.editor?.clear();
      },
      editor: null,
      async getDefaultContent() {
        return await (
          webViewComSharedContext.editor ?? never("editorRef is not ready")
        )?.getDefaultContent();
      },
      async getUploadedFiles() {
        return await (
          webViewComSharedContext.editor ?? never("editorRef is not ready")
        )?.getUploadedFiles();
      },
      async getFilesForUpload() {
        return await (
          webViewComSharedContext.editor ?? never("editorRef is not ready")
        )?.getFilesForUpload();
      },
      async setFileAsUploaded(file: UploadTrackerUploadedFile) {
        return await (
          webViewComSharedContext.editor ?? never("editorRef is not ready")
        )?.setFileAsUploaded(file);
      },
      async setFileUploadAsFailed(fileId: string) {
        return await (
          webViewComSharedContext.editor ?? never("editorRef is not ready")
        )?.setFileUploadAsFailed(fileId);
      },
      async addFiles(files: File[]) {
        return await (
          webViewComSharedContext.editor ?? never("editorRef is not ready")
        )?.addFiles(files);
      },

      setProps(props: EditorProps) {
        webViewComSharedContext.setEditorProps?.(props);
      },
      getViewportHeight() {
        return document.body.scrollHeight;
      },
      invokeMentionCommand(mentionItem: MentionItem) {
        webViewComSharedContext.command?.(mentionItem);
      },
      dismissKeyboard() {
        webViewComSharedContext.editor?.editor?.view.dom.blur();
      },
    } satisfies IWebViewExposedCom,
    webViewMessageEventEndpoint,
  );
}
