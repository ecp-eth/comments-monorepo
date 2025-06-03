import { type CommandProps } from "@tiptap/core";
import { Node, NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import { Plugin, PluginKey } from "prosemirror-state";
import { type Node as ProseMirrorNode } from "prosemirror-model";
import { useEffect, useState, useRef } from "react";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    uploadTracker: {
      addUploadedFile: (file: UploadedFile) => ReturnType;
      removeUploadedFile: (fileId: string) => ReturnType;
    };
  }
}

export type UploadedFile = {
  id: string;
  name: string;
  url: string;
  mimeType: string;
};

export type UploadTrackerAttributes = {
  uploads: UploadedFile[];
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
    return (node.attrs as UploadTrackerAttributes).uploads
      .map((file) => file.url)
      .join("\n");
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
      addUploadedFile:
        (file: UploadedFile) =>
        ({ tr, state }: CommandProps) => {
          const node = state.doc.lastChild;

          if (node?.type.name === UPLOAD_TRACKER_NODE_NAME) {
            const currentUploads = node.attrs.uploads || [];
            const pos = state.doc.content.size - node.nodeSize;

            console.log("currentUploads", currentUploads);

            tr.setNodeAttribute(pos, "uploads", [...currentUploads, file]);

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
            const currentUploads = node.attrs.uploads || [];
            const pos = state.doc.content.size - node.nodeSize;

            console.log("currentUploads", currentUploads);

            tr.setNodeAttribute(
              pos,
              "uploads",
              currentUploads.filter((f: UploadedFile) => f.id !== fileId),
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
  },
});

function FilePreview({ file }: { file: UploadedFile }) {
  const isImage = file.mimeType.startsWith("image/");
  const isVideo = file.mimeType.startsWith("video/");

  if (isImage) {
    return (
      <div className="w-[200px] h-[200px] p-2 border rounded-md bg-muted/30">
        <Image file={file} />
      </div>
    );
  }

  if (isVideo) {
    return (
      <div className="w-[200px] h-[200px] p-2 border rounded-md bg-muted/30">
        <Video file={file} />
      </div>
    );
  }

  return (
    <div className="w-[200px] h-[200px] flex items-center gap-2 p-2 border rounded-md bg-muted/30">
      <svg
        className="w-6 h-6 text-muted-foreground"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
      <span className="text-sm truncate max-w-[150px]">{file.name}</span>
    </div>
  );
}

type MediaDimensions = {
  width: number;
  height: number;
  orientation: "landscape" | "portrait" | "square";
};

function Image({ file }: { file: UploadedFile }) {
  const [dimensions, setDimensions] = useState<MediaDimensions | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const img = imgRef.current;

    if (!img) {
      return;
    }

    const updateDimensions = () => {
      setDimensions({
        width: img.naturalWidth,
        height: img.naturalHeight,
        orientation:
          img.naturalWidth > img.naturalHeight
            ? "landscape"
            : img.naturalWidth < img.naturalHeight
              ? "portrait"
              : "square",
      });
    };

    // For cached images that load immediately
    if (img.complete) {
      updateDimensions();
    }

    // For new images that need to load
    img.addEventListener("load", updateDimensions);

    return () => img.removeEventListener("load", updateDimensions);
  }, [file.url]);

  const objectFit =
    dimensions?.orientation === "landscape" ? "contain" : "cover";

  return (
    <div className="w-full h-full flex items-center justify-center">
      <img
        ref={imgRef}
        src={file.url}
        alt={file.name}
        className="max-w-full max-h-full rounded-md"
        style={{ objectFit }}
      />
    </div>
  );
}

function Video({ file }: { file: UploadedFile }) {
  const [dimensions, setDimensions] = useState<MediaDimensions | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    const updateDimensions = () => {
      setDimensions({
        width: video.videoWidth,
        height: video.videoHeight,
        orientation:
          video.videoWidth > video.videoHeight
            ? "landscape"
            : video.videoWidth < video.videoHeight
              ? "portrait"
              : "square",
      });
    };

    video.addEventListener("loadedmetadata", updateDimensions);

    return () => video.removeEventListener("loadedmetadata", updateDimensions);
  }, [file.url]);

  const objectFit =
    dimensions?.orientation === "landscape" ? "contain" : "cover";

  return (
    <div className="w-full h-full flex items-center justify-center">
      <video
        ref={videoRef}
        src={file.url}
        controls
        className="max-w-full max-h-full rounded-md"
        style={{ objectFit }}
      />
    </div>
  );
}

type UploadTrackerViewProps = {
  node: ProseMirrorNode;
};

export function UploadTrackerView({ node }: UploadTrackerViewProps) {
  const attrs = node.attrs as UploadTrackerAttributes;
  const uploads = attrs.uploads || [];

  if (uploads.length === 0) {
    return null;
  }

  return (
    <NodeViewWrapper>
      <div className="mt-2 flex flex-wrap gap-2 p-2 border-t">
        {uploads.map((file: UploadedFile) => (
          <FilePreview key={file.id} file={file} />
        ))}
      </div>
    </NodeViewWrapper>
  );
}
