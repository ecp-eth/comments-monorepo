# `@ecp.eth/react-editor`

A React-based rich text editor for the Ethereum Comments Protocol.

The ECP React Editor provides a powerful, customizable rich text editor built on top of TipTap that supports mentions, file uploads, and seamless integration with the Ethereum Comments Protocol. For comprehensive documentation and guides, visit our [documentation website](https://docs.ethcomments.xyz).

See an example of the React Editor in action at [share.ethcomments.xyz](https://share.ethcomments.xyz).

## Installation

```bash
npm install @ecp.eth/react-editor
# or
yarn add @ecp.eth/react-editor
# or
pnpm add @ecp.eth/react-editor
```

## Features

- **Rich Text Editing**: Built on TipTap with support for paragraphs, links, and formatting
- **Mentions**: Support for ENS, Farcaster, and ERC-20 token mentions with autocomplete
- **File Uploads**: Drag-and-drop file uploads with support for images, videos, and documents
- **Reference Extraction**: Extract structured references from editor content
- **Content Parsing**: Parse plain text with references back into rich content
- **Customizable Components**: Fully customizable media components and themes
- **TypeScript Support**: Full TypeScript support with comprehensive type definitions

## Quick Start

```tsx
import { Editor } from "@ecp.eth/react-editor";
import { useIndexerSuggestions } from "@ecp.eth/react-editor/hooks";
import { usePinataUploadFiles } from "@ecp.eth/react-editor/hooks";

function CommentEditor() {
  const suggestions = useIndexerSuggestions();
  const uploads = usePinataUploadFiles();

  return (
    <Editor
      placeholder="Write your comment..."
      suggestions={suggestions}
      uploads={uploads}
      onBlur={() => console.log("Editor lost focus")}
    />
  );
}
```

## Core Components

### Editor

The main editor component with full rich text editing capabilities.

```tsx
import { Editor, type EditorRef } from "@ecp.eth/react-editor";

const editorRef = useRef<EditorRef>(null);

<Editor
  ref={editorRef}
  placeholder="Write your comment..."
  suggestions={suggestions}
  uploads={uploads}
  autoFocus={true}
  onBlur={() => console.log("Editor lost focus")}
  onEscapePress={() => console.log("Escape pressed")}
/>;
```

### EditorRef Methods

The editor ref provides several useful methods:

```tsx
// Focus the editor
editorRef.current?.focus();

// Clear editor content
editorRef.current?.clear();

// Add files programmatically
editorRef.current?.addFiles([file1, file2]);

// Get uploaded files
const uploadedFiles = editorRef.current?.getUploadedFiles();

// Get files pending upload
const pendingFiles = editorRef.current?.getFilesForUpload();

// Mark file as uploaded
editorRef.current?.setFileAsUploaded(uploadedFile);

// Mark file upload as failed
editorRef.current?.setFileUploadAsFailed(fileId);
```

## Hooks

### useIndexerSuggestions

Provides suggestions for ENS, Farcaster, and ERC-20 mentions using the ECP Indexer.

```tsx
import { useIndexerSuggestions } from "@ecp.eth/react-editor/hooks";

const suggestions = useIndexerSuggestions({
  indexerUrl: "https://indexer.ethcomments.xyz",
});
```

### usePinataUploadFiles

Provides file upload functionality using Pinata IPFS service.

```tsx
import { usePinataUploadFiles } from "@ecp.eth/react-editor/hooks";

const uploads = usePinataUploadFiles({
  pinataApiKey: "your-pinata-api-key",
  pinataSecretApiKey: "your-pinata-secret-key",
});
```

### useHandleDefaultEditorValue

Handles setting default editor values with content and references.

```tsx
import { useHandleDefaultEditorValue } from "@ecp.eth/react-editor/hooks";

const content = useHandleDefaultEditorValue(
  defaultValue?.content,
  defaultValue?.references,
);
```

## Utilities

### extractReferences

Extract structured references from editor content.

```tsx
import { extractReferences } from "@ecp.eth/react-editor/extract-references";

const editorContent = editorRef.current?.editor?.getJSON();
const references = extractReferences(editorContent);
```

### parse

Parse plain text with references back into rich content.

```tsx
import { parse } from "@ecp.eth/react-editor/parser";

const richContent = parse(plainText, references);
```

## Configuration

### File Upload Limits

```tsx
// Default limits
const ALLOWED_UPLOAD_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "video/mp4",
  "video/webm",
  "video/avi",
  "video/quicktime",
];

const MAX_UPLOAD_FILE_SIZE = 1024 * 1024 * 10; // 10MB
```

### Custom Media Components

You can customize how media files are displayed:

```tsx
import { CustomImageComponent } from "./CustomImageComponent";
import { CustomVideoComponent } from "./CustomVideoComponent";
import { CustomFileComponent } from "./CustomFileComponent";

<Editor
  imageComponent={CustomImageComponent}
  videoComponent={CustomVideoComponent}
  fileComponent={CustomFileComponent}
  // ... other props
/>;
```

## Types

The package exports comprehensive TypeScript types:

```tsx
import type {
  EditorRef,
  EditorProps,
  EditorSuggestionsService,
  UploadFilesService,
  MentionItem,
  LinkAttributes,
  MentionsExtensionTheme,
} from "@ecp.eth/react-editor/types";
```

## Advanced Usage

### Custom Suggestions Service

```tsx
const customSuggestions: EditorSuggestionsService = {
  search: async (query: string) => {
    // Implement your own search logic
    return [
      { type: "ens", address: "0x...", name: "example.eth" },
      { type: "farcaster", address: "0x...", fname: "example" },
    ];
  },
};
```

### Custom Upload Service

```tsx
const customUploads: UploadFilesService = {
  allowedMimeTypes: ["image/png", "image/jpeg"],
  maxFileSize: 5 * 1024 * 1024, // 5MB
  uploadFile: async (file, callbacks) => {
    // Implement your own upload logic
    const response = await uploadToYourService(file);
    callbacks?.onSuccess?.(uploadedFile, response);
    return response;
  },
  uploadFiles: async (files, callbacks) => {
    // Implement batch upload logic
    return Promise.all(
      files.map((file) => customUploads.uploadFile(file, callbacks)),
    );
  },
};
```

## Peer Dependencies

This package requires the following peer dependencies:

- `@tanstack/react-query` >= 5.0.0
- `pinata` ^2.4.3
- `react` 18 || 19
- `viem` ^2.29.2

## License

MIT
