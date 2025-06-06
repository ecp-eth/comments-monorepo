# Comments SDK - Metadata Serialization & Signature Verification

This SDK provides comprehensive support for the new comment metadata system, including serialization, signature verification, and utilities for working with key-value metadata pairs.

## Overview

The new comment system uses a key-value metadata structure instead of JSON strings, providing better gas efficiency and type safety. Metadata is included in EIP-712 signatures, ensuring that all metadata is cryptographically verified.

## Key Features

- ✅ **Gas Efficient**: Only stores metadata when present (empty mappings cost no gas)
- ✅ **Type Safe**: Proper TypeScript types for all metadata operations
- ✅ **Signature Verified**: Metadata is included in EIP-712 signatures
- ✅ **Backward Compatible**: Utilities to convert legacy JSON metadata
- ✅ **Flexible**: Support for custom metadata types and encoding

## Core Types

### MetadataEntry

```typescript
type MetadataEntry = {
  key: Hex; // keccak256 hash of "type key" string
  value: Hex; // Encoded value as bytes
};
```

### Comment Types

```typescript
const COMMENT_TYPE_COMMENT = 0; // Standard comment
const COMMENT_TYPE_REACTION = 1; // Reaction (like, dislike, etc.)
```

## Basic Usage

### Creating Metadata Entries

```typescript
import { createMetadataEntry, createMetadataEntries } from "@your-org/sdk";

// Single metadata entry
const statusEntry = createMetadataEntry("status", "published");

// Multiple entries from object
const metadata = createMetadataEntries({
  status: "published",
  priority: 1,
  verified: true,
});
```

### Creating Comments with Metadata

```typescript
import {
  createCommentDataWithMetadata,
  getAddCommentSigningHash,
} from "@your-org/sdk";

const commentData = createCommentDataWithMetadata({
  content: "This is a comment with metadata",
  metadata: [
    createMetadataEntry("status", "published"),
    createMetadataEntry("priority", 1),
  ],
  targetUri: "https://example.com/post/123",
  commentType: COMMENT_TYPE_COMMENT,
  author: "0x..." as Address,
  app: "0x..." as Address,
  channelId: 0n,
  deadline: BigInt(Date.now() + 24 * 60 * 60 * 1000),
  parentId: "0x0000..." as Hex,
});

// Generate signing hash
const signingHash = getAddCommentSigningHash(
  commentData,
  1, // chainId
  COMMENT_MANAGER_ADDRESS,
);
```

### Signature Verification

```typescript
import { verifyAddCommentSignature } from "@your-org/sdk";

const isValid = await verifyAddCommentSignature(
  commentData,
  signature,
  signerAddress,
  chainId,
  contractAddress,
);
```

## Advanced Features

### Reaction Comments

```typescript
import { MetadataHelpers, COMMENT_TYPE_REACTION } from "@your-org/sdk";

const reactionData = createCommentDataWithMetadata({
  content: "like", // Reaction type in content
  metadata: MetadataHelpers.reaction("like"),
  commentType: COMMENT_TYPE_REACTION,
  // ... other fields
});
```

### Author Information Metadata

```typescript
const metadata = [
  ...MetadataHelpers.withAuthorInfo(
    "alice.eth",
    "https://example.com/avatar.jpg",
  ),
  ...MetadataHelpers.withTags(["discussion", "web3", "ethereum"]),
];
```

### Custom Metadata Types

```typescript
import { createCustomMetadataEntry } from "@your-org/sdk";

const metadata = [
  // Store an address
  createCustomMetadataEntry(
    "referrer",
    "address",
    "0x1234567890123456789012345678901234567890",
  ),
  // Store a hash
  createCustomMetadataEntry(
    "content_hash",
    "bytes32",
    "0x1234567890123456789012345678901234567890123456789012345678901234",
  ),
];
```

### Verifying Required Metadata

```typescript
import { verifyCommentIncludesMetadata } from "@your-org/sdk";

const requiredKeys = ["moderation_status", "content_type", "language"];
const isValid = await verifyCommentIncludesMetadata(
  commentData,
  requiredKeys,
  signature,
  signerAddress,
  chainId,
  contractAddress,
);
```

### Legacy JSON Conversion

```typescript
import { convertJsonMetadataToEntries } from "@your-org/sdk";

// Convert legacy JSON metadata
const legacyMetadata = {
  status: "published",
  category: "general",
  tags: ["web3", "ethereum"],
};

const metadataEntries = convertJsonMetadataToEntries(legacyMetadata);
```

## Encoding Types

The system supports automatic encoding for common types:

| JavaScript Type   | Metadata Type | Encoding                   |
| ----------------- | ------------- | -------------------------- |
| `string`          | `"string"`    | UTF-8 bytes                |
| `number`/`bigint` | `"uint256"`   | 32-byte big-endian         |
| `boolean`         | `"bool"`      | 32-byte (1 or 0)           |
| `object`          | `"string"`    | JSON string as UTF-8 bytes |

## API Reference

### Metadata Creation

- `createMetadataEntry(key, value)` - Create single metadata entry
- `createMetadataEntries(object)` - Create multiple entries from object
- `createCustomMetadataEntry(key, type, encodedValue)` - Create with custom type

### Comment Data Creation

- `createCommentDataWithMetadata(params)` - Create comment with metadata
- `createEditCommentDataWithMetadata(params)` - Create edit data with metadata

### Signature Operations

- `getAddCommentSigningHash(data, chainId, contract)` - Get hash for signing
- `getEditCommentSigningHash(data, chainId, contract)` - Get edit hash for signing
- `verifyAddCommentSignature(...)` - Verify comment signature
- `verifyEditCommentSignature(...)` - Verify edit signature
- `verifyCommentIncludesMetadata(...)` - Verify required metadata

### Encoding Utilities

- `encodeStringValue(value)` - Encode string as bytes
- `encodeBoolValue(value)` - Encode boolean as bytes
- `encodeNumberValue(value)` - Encode number as bytes
- `encodeJsonValue(value)` - Encode object as JSON bytes

### Helper Functions

- `MetadataHelpers.reaction(type)` - Create reaction metadata
- `MetadataHelpers.withTags(tags)` - Create tag metadata
- `MetadataHelpers.withAuthorInfo(username, avatar)` - Create author metadata
- `MetadataHelpers.withReference(url, title)` - Create reference metadata
- `MetadataHelpers.custom(key, value)` - Create custom metadata

## Migration Guide

### From JSON Metadata

**Old (JSON string):**

```typescript
const metadata = JSON.stringify({
  status: "published",
  priority: 1,
});
```

**New (MetadataEntry array):**

```typescript
const metadata = createMetadataEntries({
  status: "published",
  priority: 1,
});
```

### From String Comment Types

**Old:**

```typescript
commentType: "comment";
```

**New:**

```typescript
commentType: COMMENT_TYPE_COMMENT; // 0
```

## Gas Optimization

The new metadata system provides significant gas savings:

- **Empty metadata**: 0 gas (vs ~20k gas for empty JSON string)
- **Small metadata**: ~50% reduction in storage costs
- **Large metadata**: Proportional savings based on actual data stored

## Security Considerations

1. **Signature Verification**: Always verify that metadata is included in signatures
2. **Key Validation**: Validate metadata keys match expected formats
3. **Value Sanitization**: Sanitize metadata values before display
4. **Size Limits**: Implement reasonable limits on metadata size

## Examples

See `examples.ts` for comprehensive examples covering:

- Basic metadata creation
- Reaction comments
- Author information
- Signature verification
- Custom metadata types
- Legacy conversion
- Required metadata verification

## Support

For questions or issues with the metadata system:

1. Check the examples in `examples.ts`
2. Review the API documentation above
3. Open an issue in the repository
