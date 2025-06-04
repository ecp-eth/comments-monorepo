import { NodeViewProps, type CommandProps } from "@tiptap/core";
import { Node, NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import {
  type UploadTrackerFile,
  type UploadTrackerUploadedFile,
  type UploadTrackerAttributes,
  type UploadTrackerFileToUpload,
} from "./types";
import { UploadTrackerFile as UploadTrackerFileComponent } from "./components/UploadTrackerFile";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    uploadTracker: {
      addFile: (file: UploadTrackerFile) => ReturnType;
      updateFile: (file: UploadTrackerUploadedFile) => ReturnType;
      removeUploadedFile: (fileId: string) => ReturnType;
    };
  }
}

export type {
  UploadTrackerFile,
  UploadTrackerUploadedFile,
  UploadTrackerAttributes,
  UploadTrackerFileToUpload,
};

export const UPLOAD_TRACKER_NODE_NAME = "uploadTracker";

export const UploadTracker = Node.create({
  name: UPLOAD_TRACKER_NODE_NAME,
  group: "block",
  atom: true, // Makes it a single unit that can't be edited internally
  selectable: true,
  draggable: false,
  inline: false,

  addAttributes() {
    return {
      uploads: {
        default: () => [], // Return a new array each time
        parseHTML: (element) => {
          return element.getAttribute("data-uploads")
            ? JSON.parse(element.getAttribute("data-uploads") || "[]")
            : [];
        },
        renderHTML: (attributes) => {
          return {
            "data-uploads": JSON.stringify(attributes.uploads),
          };
        },
      },
    };
  },

  renderText({ node }) {
    return (
      (node.attrs as UploadTrackerAttributes).uploads
        // ignore files that weren't uploaded yet
        .map((file) => ("url" in file ? file.url : ""))
        .join("\n")
    );
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="upload-tracker"]',
      },
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(UploadTrackerView);
  },

  addCommands() {
    return {
      addFile:
        (file: UploadTrackerFile) =>
        ({ tr, state }: CommandProps) => {
          const node = state.doc.lastChild;

          if (node?.type.name === UPLOAD_TRACKER_NODE_NAME) {
            const currentUploads =
              (node.attrs as UploadTrackerAttributes).uploads || [];
            const pos = state.doc.content.size - node.nodeSize;

            tr.setNodeAttribute(pos, "uploads", [...currentUploads, file]);

            state.apply(tr);

            return true;
          }

          tr.insert(
            state.doc.content.size,
            this.type.create({
              uploads: [file],
            }),
          );

          state.apply(tr);

          return true;
        },
      updateFile:
        (file: UploadTrackerUploadedFile) =>
        ({ tr, state }: CommandProps) => {
          const node = state.doc.lastChild;

          if (node?.type.name === UPLOAD_TRACKER_NODE_NAME) {
            const currentUploads =
              (node.attrs as UploadTrackerAttributes).uploads || [];
            const pos = state.doc.content.size - node.nodeSize;

            tr.setNodeAttribute(
              pos,
              "uploads",
              currentUploads.map((currentFile) => {
                if (currentFile.id === file.id) {
                  return file;
                }

                return currentFile;
              }),
            );

            state.apply(tr);

            return true;
          }

          return false;
        },
      removeUploadedFile:
        (fileId: string) =>
        ({ tr, state }: CommandProps) => {
          const node = state.doc.lastChild;

          if (node?.type.name === UPLOAD_TRACKER_NODE_NAME) {
            const currentUploads =
              (node.attrs as UploadTrackerAttributes).uploads || [];
            const pos = state.doc.content.size - node.nodeSize;

            tr.setNodeAttribute(
              pos,
              "uploads",
              currentUploads.filter((f) => f.id !== fileId),
            );

            state.apply(tr);

            return true;
          }

          return false;
        },
    };
  },

  /* addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("uploadTracker"),
        appendTransaction: (transactions, oldState, newState) => {
          // Ensure the upload tracker is always at the end
          const lastNode = newState.doc.lastChild;

          if (!lastNode || lastNode.type.name !== UPLOAD_TRACKER_NODE_NAME) {
            const tr = newState.tr;

            tr.insert(
              newState.doc.content.size,
              newState.schema.nodes.uploadTracker.create(),
            );

            return tr;
          }

          return null;
        },
      }),
    ];
  },*/
});

export function UploadTrackerView({ editor, node }: NodeViewProps) {
  const attrs = node.attrs as UploadTrackerAttributes;
  const uploads = attrs.uploads || [];

  if (uploads.length === 0) {
    return null;
  }

  return (
    <NodeViewWrapper>
      <div className="mt-2 flex flex-wrap gap-2 p-2">
        {uploads.map((file: UploadTrackerFile) => (
          <UploadTrackerFileComponent
            key={file.id}
            file={file}
            onDeleteClick={() => {
              editor.commands.removeUploadedFile(file.id);
            }}
          />
        ))}
      </div>
    </NodeViewWrapper>
  );
}
