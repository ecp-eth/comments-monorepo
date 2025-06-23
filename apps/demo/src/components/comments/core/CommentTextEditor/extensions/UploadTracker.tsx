import { NodeViewProps, type CommandProps } from "@tiptap/core";
import { Node, NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import { Plugin, PluginKey } from "prosemirror-state";
import { type Node as ProseMirrorNode } from "prosemirror-model";
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

  renderHTML() {
    return ["div", { "data-type": "upload-tracker" }, 0];
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

            tr.setMeta("isUploadUpdate", true).setNodeAttribute(
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
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("uploadTracker"),
        appendTransaction: (transactions, oldState, newState) => {
          // First check if we have any uploads in the document
          let hasUploadsInDoc = false;

          newState.doc.descendants((node) => {
            if (
              node.type.name === UPLOAD_TRACKER_NODE_NAME &&
              (node.attrs as UploadTrackerAttributes).uploads?.length > 0
            ) {
              hasUploadsInDoc = true;
              return false;
            }
          });

          // If no uploads, don't do anything
          if (!hasUploadsInDoc) {
            return null;
          }

          const lastNode = newState.doc.lastChild;

          // If we have uploads but nothing else, prepend a paragraph
          if (
            newState.doc.firstChild !== lastNode ||
            lastNode?.type.name !== UPLOAD_TRACKER_NODE_NAME
          ) {
            return null;
          }

          const tr = newState.tr;

          // Add an empty paragraph before the upload tracker
          tr.insert(
            newState.doc.content.size - 1,
            newState.schema.nodes.paragraph.create(),
          );

          return tr;
        },
        filterTransaction: (tr, state) => {
          // be careful, if you try to clear the editor using editor.commands.clearContent() it won't work
          // unless you set `wantsToClearEditor` meta to true
          if (
            tr.getMeta("isUploadUpdate") ||
            tr.getMeta("wantsToClearEditor")
          ) {
            return true;
          }

          const findUploadTrackerNode = (
            doc: ProseMirrorNode,
          ): ProseMirrorNode | null => {
            let found: ProseMirrorNode | null = null;

            doc.descendants((node) => {
              if (node.type.name === UPLOAD_TRACKER_NODE_NAME) {
                found = node;
              }
            });

            return found;
          };

          // Only prevent transactions that would delete the node itself while having uploads
          const uploadTrackerInDoc = findUploadTrackerNode(state.doc);
          const uploadTrackerInTr = findUploadTrackerNode(tr.doc);

          const hasTrackerWithUploadsInDoc =
            uploadTrackerInDoc &&
            (uploadTrackerInDoc.attrs as UploadTrackerAttributes).uploads
              ?.length > 0;

          // Only block if we're removing the node itself while it has uploads
          if (hasTrackerWithUploadsInDoc && !uploadTrackerInTr) {
            return false;
          }

          return true;
        },
      }),
    ];
  },
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
