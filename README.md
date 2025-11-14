[deploy-vercel]: https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fecp-eth%2Fcomments-monorepo%2Ftree%2Ftemplate-signer-api&env=RPC_URL_8453,APP_SIGNER_PRIVATE_KEY,COMMENTS_INDEXER_URL&envDescription=For%20detailed%20Environment%20Variables%20configuration%20please%20see%3A&envLink=https%3A%2F%2Fdocs.ethcomments.xyz%2Fdemos%2Fsigner-api-service%23environment-variables&project-name=signer-api-service&repository-name=signer-api-service "1 click deploy to Vercel"

# ECP Comments Signer

A Next.js API service for signing ECP comments. Provides both standard signing and gasless signing endpoints for posting, editing, and deleting comments.

[![Deploy with Vercel](https://vercel.com/button)][deploy-vercel]

## Features

- **Standard Signing**: Sign comments with app signature using `/api/post-comment/sign` and `/api/edit-comment/sign`
- **Gasless Signing**: Submit comments without user gas costs using `/api/post-comment/send`, `/api/edit-comment/send`, and `/api/delete-comment/send`
- **Edit Comment Support**: Sign and submit comment edits
- **Delete Comment Support**: Submit comment deletions (gasless only)
- **Approve/Revoke Signer**: Approve or revoke gasless signer address using `/api/approve-signer/send` and `/api/revoke-signer/send`
- **Multi-Chain Support**: Configure multiple chains with individual RPC URLs
- **Conditional Endpoints**: Gasless endpoints only available when properly configured
- **Type Safety**: Full TypeScript support with Zod validation
- **Vercel Ready**: Optimized for Vercel deployment

## Quick Start

1. **Clone and install dependencies:**

   ```bash
   git clone https://github.com/ecp-eth/comments-monorepo.git
   cd examples/signer
   pnpm install
   ```

2. **Set up environment variables:**

   ```bash
   cp .env.example .env.local
   # Edit .env.local with your values
   ```

3. **Run the development server:**

   ```bash
   pnpm dev
   ```

4. **Deploy to Vercel:**

   [![Deploy with Vercel](https://vercel.com/button)][deploy-vercel]

## Environment Variables

### Required

- `ENABLED_CHAINS`: Comma-separated list of chain IDs supported by the endpoints (must be supported by @ecp.eth/sdk)
- `DEFAULT_CHAIN_ID`: Default chain ID for the service (must be one of the enabled chains and supported by @ecp.eth/sdk)
- `RPC_URL_{chainId}`: RPC URL for each enabled chain (e.g., `RPC_URL_31337` for chain 31337)

### Optional

- `APP_SIGNER_PRIVATE_KEY`: Private key for app signer used to sign comments using `/api/post-comment/sign` and `/api/edit-comment/sign`. If not set, these endpoints will return 404
- `COMMENTS_INDEXER_URL`: Comments indexer URL for muted account checking. If not set, the check is disabled

### Gasless Configuration

For gasless (sponsored) transactions, you can use either private key method or Privy method. If both are configured, the private key method will be used.

#### Method Selection

- `GASLESS_METHOD`: Which method to use for preparing and sending comments
  - `"private-key"`: Uses `GASLESS_APP_SIGNER_PRIVATE_KEY` + `GASLESS_SUBMITTER_PRIVATE_KEY`
  - `"privy"`: Uses `GASLESS_PRIVY_APP_SIGNER_PRIVATE_KEY` + `GASLESS_PRIVY_*` variables
  - If not set, gasless endpoints will return 404

#### Private Key Method (`"private-key"`)

- `GASLESS_APP_SIGNER_PRIVATE_KEY`: Used to sign comment data in gasless send endpoints. If not set, `GASLESS_SUBMITTER_PRIVATE_KEY` will be used
- `GASLESS_SUBMITTER_PRIVATE_KEY`: **Required** - Used to send signed comment data using `/api/post-comment/send`, `/api/edit-comment/send`, and `/api/delete-comment/send` endpoints

#### Privy Method (`"privy"`)

- `GASLESS_PRIVY_APP_SIGNER_PRIVATE_KEY`: Used to sign comment data in gasless send endpoints. If not set, the Privy account is used to sign
- `GASLESS_PRIVY_APP_ID`: **Required** - Privy app ID
- `GASLESS_PRIVY_SECRET`: **Required** - Privy secret
- `GASLESS_PRIVY_AUTHORIZATION_KEY`: **Required** - Privy authorization key
- `GASLESS_PRIVY_WALLET_ADDRESS`: **Required** - Privy wallet address
- `GASLESS_PRIVY_WALLET_ID`: **Required** - Privy wallet ID

## API Endpoints

### POST /api/post-comment/sign

Standard comment signing endpoint. Always available when `APP_SIGNER_PRIVATE_KEY` is configured.

**Request:** See [`SignPostCommentRequestPayloadSchema`](../../packages/shared-signer/src/schemas/signer-api/post.ts)

**Response:** See [`SignPostCommentResponseBodySchema`](../../packages/shared-signer/src/schemas/signer-api/post.ts)

### POST /api/post-comment/send

Send gasless comment with author signature. Returns 404 if gasless method is not configured.

**Request:** See [`SendPostCommentRequestPayloadSchema`](../../packages/shared-signer/src/schemas/signer-api/post.ts)

**Response:** See [`SendPostCommentResponseBodySchema`](../../packages/shared-signer/src/schemas/signer-api/post.ts)

## Edit Comment Endpoints

### POST /api/edit-comment/sign

Standard edit comment signing endpoint. Always available when `APP_SIGNER_PRIVATE_KEY` is configured.

**Request:** See [`SignEditCommentRequestPayloadSchema`](../../packages/shared-signer/src/schemas/signer-api/edit.ts)

**Response:** See [`SignEditCommentResponseBodySchema`](../../packages/shared-signer/src/schemas/signer-api/edit.ts)

### POST /api/edit-comment/send

Send gasless edit comment with author signature. Returns 404 if gasless method is not configured.

**Request:** See [`SendEditCommentRequestPayloadSchema`](../../packages/shared-signer/src/schemas/signer-api/edit.ts)

**Response:** See [`SendEditCommentResponseBodySchema`](../../packages/shared-signer/src/schemas/signer-api/edit.ts)

## Delete Comment Endpoints

### Non-Gasless Delete

For non-gasless delete, app signature is not required. Simply call `deleteComment` from `@ecp.eth/sdk/comments` with the comment ID. The client broadcasts the transaction and pays for gas.

### POST /api/delete-comment/send

Send gasless delete comment with author signature. Returns 404 if gasless method is not configured.

**Request:** See [`SendDeleteCommentRequestPayloadSchema`](../../packages/shared-signer/src/schemas/signer-api/delete.ts)

**Response:** See [`SendDeleteCommentResponseBodySchema`](../../packages/shared-signer/src/schemas/signer-api/delete.ts)

## Approve Signer Endpoints

### POST /api/approve-signer/send

Approve the gasless signer address to post comments on behalf of the author. This allows the author to use SIWE access tokens instead of signing each comment individually. Returns 404 if gasless method is not configured.

**Request:** See [`SendApproveSignerRequestPayloadSchema`](../../packages/shared-signer/src/schemas/signer-api/approve.ts)

**Response:** See [`SendApproveSignerResponseBodySchema`](../../packages/shared-signer/src/schemas/signer-api/approve.ts)

## Revoke Signer Endpoints

### POST /api/revoke-signer/send

Revoke approval for the gasless signer address. After revocation, the author will need to sign each comment individually again. Returns 404 if gasless method is not configured.

**Request:** See [`SendRevokeSignerRequestPayloadSchema`](../../packages/shared-signer/src/schemas/signer-api/revoke.ts)

**Response:** See [`SendRevokeSignerResponseBodySchema`](../../packages/shared-signer/src/schemas/signer-api/revoke.ts)

## Usage Examples

### cURL - Standard Signing

```bash
curl -X POST http://localhost:3000/api/post-comment/sign \
  -H "Content-Type: application/json" \
  -d '{
    "author": "0x1234567890abcdef1234567890abcdef1234567890",
    "content": "Hello, world!",
    "metadata": [],
    "chainId": 8453,
    "targetUri": "https://example.com"
  }'
```

### cURL - Gasless Send

```bash
curl -X POST http://localhost:3000/api/post-comment/send \
  -H "Content-Type: application/json" \
  -d '{
    "comment": {
      "author": "0x1234567890abcdef1234567890abcdef1234567890",
      "content": "Hello, world!",
      "metadata": [],
      "chainId": 8453,
      "targetUri": "https://example.com"
    },
    "authorSignature": "0x...",
    "deadline": "1234567890"
  }'
```

### cURL - Edit Comment Sign

```bash
curl -X POST http://localhost:3000/api/edit-comment/sign \
  -H "Content-Type: application/json" \
  -d '{
    "commentId": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    "content": "Updated comment text",
    "author": "0x1234567890abcdef1234567890abcdef1234567890",
    "metadata": [],
    "chainId": 8453
  }'
```

### cURL - Edit Comment Gasless Send

```bash
curl -X POST http://localhost:3000/api/edit-comment/send \
  -H "Content-Type: application/json" \
  -d '{
    "edit": {
      "commentId": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      "content": "Updated comment text",
      "author": "0x1234567890abcdef1234567890abcdef1234567890",
      "metadata": [],
      "chainId": 8453
    },
    "authorSignature": "0x...",
    "deadline": "1234567890"
  }'
```

### cURL - Delete Comment Gasless Send

```bash
curl -X POST http://localhost:3000/api/delete-comment/send \
  -H "Content-Type: application/json" \
  -d '{
    "delete": {
      "author": "0x1234567890abcdef1234567890abcdef1234567890",
      "commentId": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      "chainId": 8453
    },
    "authorSignature": "0x...",
    "deadline": "1234567890"
  }'
```

### cURL - Approve Signer

```bash
curl -X POST http://localhost:3000/api/approve-signer/send \
  -H "Content-Type: application/json" \
  -d '{
    "signTypedDataParams": { ... },
    "authorSignature": "0x...",
    "authorAddress": "0x1234567890abcdef1234567890abcdef1234567890",
    "chainId": 8453
  }'
```

### cURL - Revoke Signer

```bash
curl -X POST http://localhost:3000/api/revoke-signer/send \
  -H "Content-Type: application/json" \
  -d '{
    "signTypedDataParams": { ... },
    "authorSignature": "0x...",
    "authorAddress": "0x1234567890abcdef1234567890abcdef1234567890",
    "chainId": 8453
  }'
```

### TypeScript - Standard Signing (Non-Gasless)

#### Post Comment

Get app signature from signer API, then submit transaction on-chain with the client paying for gas.

```typescript
import { postComment } from "@ecp.eth/sdk/comments";

// Step 1: Get app signature from signer API
const response = await fetch("/api/post-comment/sign", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    author: "0x1234567890abcdef1234567890abcdef1234567890",
    content: "Hello, world!",
    metadata: [],
    chainId: 8453,
    targetUri: "https://example.com",
  }),
});

const { signature: appSignature, data } = await response.json();

// Step 2: Submit transaction with app signature
// The client broadcasts the transaction and pays for gas
const { txHash } = await postComment({
  comment: data,
  appSignature,
  writeContract: walletClient.writeContract,
});
```

#### Edit Comment

Get app signature from signer API, then submit transaction on-chain with the client paying for gas.

```typescript
import { editComment } from "@ecp.eth/sdk/comments";

// Step 1: Get app signature from signer API
const editResponse = await fetch("/api/edit-comment/sign", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    commentId:
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    content: "Updated comment text",
    author: "0x1234567890abcdef1234567890abcdef1234567890",
    metadata: [],
    chainId: 8453,
  }),
});

const { signature: appSignature, data } = await editResponse.json();

// Step 2: Submit transaction with app signature
// The client broadcasts the transaction and pays for gas
const { txHash } = await editComment({
  edit: data,
  appSignature,
  writeContract: walletClient.writeContract,
});
```

### TypeScript - Gasless Flow

#### Post Comment (Non-Preapproved)

Create typed data, get author signature, then send to signer API which submits the transaction and pays for gas.

```typescript
import {
  createCommentData,
  createCommentTypedData,
} from "@ecp.eth/sdk/comments";

// Post comment - Gasless (Non-Preapproved)
const commentData = {
  author: "0x1234567890abcdef1234567890abcdef1234567890",
  content: "Hello, world!",
  metadata: [],
  chainId: 8453,
  targetUri: "https://example.com",
};

// Create typed data and get author signature
const typedData = createCommentTypedData({
  commentData: createCommentData({
    ...commentData,
    app: "0x...", // App signer address
  }),
  chainId: 8453,
});

const authorSignature = await userWallet.signTypedData(typedData);

// Send to signer API
const sendResponse = await fetch("/api/post-comment/send", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    comment: commentData,
    authorSignature,
    deadline: typedData.message.deadline.toString(),
  }),
});

const { txHash } = await sendResponse.json();
```

#### Post Comment (Preapproved)

When a user has pre-approved the gasless signer address, they can use a SIWE (Sign-In with Ethereum) access token from the indexer instead of signing each comment individually. This eliminates the need for repetitive signing while maintaining security through on-chain verification. The access token is obtained once and can be reused for multiple operations until it expires. The same pattern applies to edit and delete operations—simply use the `Authorization` header with the access token instead of providing `authorSignature`.

```typescript
// Step 1: Get SIWE nonce from indexer
const nonceResponse = await fetch(`${INDEXER_URL}/api/auth/siwe/nonce`, {
  method: "POST",
});
const { nonce, token: nonceToken } = await nonceResponse.json();

// Step 2: Sign SIWE message with wallet
// Construct SIWE message following EIP-4361 format with the nonce from step 1
const siweMessage = `...`; // Use a SIWE library to construct the message
const siweSignature = await userWallet.signMessage({ message: siweMessage });

// Step 3: Verify and get access token from indexer
const verifyResponse = await fetch(`${INDEXER_URL}/api/auth/siwe/verify`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    message: siweMessage,
    signature: siweSignature,
    token: nonceToken,
  }),
});
const { accessToken } = await verifyResponse.json();

// Step 4: Send to signer API with access token (no authorSignature needed)
const sendResponse = await fetch("/api/post-comment/send", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken.token}`,
  },
  body: JSON.stringify({
    comment: commentData,
  }),
});

const { txHash } = await sendResponse.json();
```

#### Edit Comment (Non-Preapproved)

Get nonce, create typed data, get author signature, then send to signer API which submits the transaction and pays for gas.

```typescript
import {
  createEditCommentData,
  createEditCommentTypedData,
  getNonce,
} from "@ecp.eth/sdk/comments";

// Edit comment - Gasless (Non-Preapproved)
const editData = {
  commentId:
    "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
  content: "Updated comment text",
  author: "0x1234567890abcdef1234567890abcdef1234567890",
  metadata: [],
  chainId: 8453,
};

// Get nonce and create typed data
const nonce = await getNonce({
  author: editData.author,
  app: "0x...",
  readContract,
});
const editCommentData = createEditCommentData({
  ...editData,
  app: "0x...",
  nonce,
});

const typedData = createEditCommentTypedData({
  edit: editCommentData,
  author: editData.author,
  chainId: 8453,
});

const authorSignature = await userWallet.signTypedData(typedData);

// Send to signer API
const sendResponse = await fetch("/api/edit-comment/send", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    edit: editData,
    authorSignature,
    deadline: editCommentData.deadline.toString(),
  }),
});

const { txHash } = await sendResponse.json();
```

#### Edit Comment (Preapproved)

Get SIWE access token from indexer, then send to signer API with Authorization header. No author signature needed.

```typescript
// Use SIWE access token (obtained from indexer as shown in Post Comment example)
const sendResponse = await fetch("/api/edit-comment/send", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken.token}`,
  },
  body: JSON.stringify({
    edit: editData,
  }),
});

const { txHash } = await sendResponse.json();
```

#### Delete Comment (Non-Preapproved)

Create typed data, get author signature, then send to signer API which submits the transaction and pays for gas.

```typescript
import { createDeleteCommentTypedData } from "@ecp.eth/sdk/comments";

// Delete comment - Gasless (Non-Preapproved)
const deleteData = {
  author: "0x1234567890abcdef1234567890abcdef1234567890",
  commentId:
    "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
  chainId: 8453,
};

// Create typed data and get author signature
const typedData = createDeleteCommentTypedData({
  commentId: deleteData.commentId,
  author: deleteData.author,
  app: "0x...",
  chainId: 8453,
});

const authorSignature = await userWallet.signTypedData(typedData);

// Send to signer API
const sendResponse = await fetch("/api/delete-comment/send", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    delete: deleteData,
    authorSignature,
    deadline: typedData.message.deadline.toString(),
  }),
});

const { txHash } = await sendResponse.json();
```

#### Delete Comment (Preapproved)

Get SIWE access token from indexer, then send to signer API with Authorization header. No author signature needed.

```typescript
// Use SIWE access token (obtained from indexer as shown in Post Comment example)
const sendResponse = await fetch("/api/delete-comment/send", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken.token}`,
  },
  body: JSON.stringify({
    delete: deleteData,
  }),
});

const { txHash } = await sendResponse.json();
```

#### Approve Signer

Get nonce, create approval typed data, get author signature, then send to signer API which submits the transaction and pays for gas.

```typescript
import { createApprovalTypedData, getNonce } from "@ecp.eth/sdk/comments";

// Get nonce for approval
const nonce = await getNonce({
  author: authorAddress,
  app: appSignerAddress,
  readContract: publicClient.readContract,
});

// Create approval typed data
const typedData = createApprovalTypedData({
  author: authorAddress,
  app: appSignerAddress,
  nonce,
  chainId: 8453,
});

// Get author signature
const authorSignature = await userWallet.signTypedData(typedData);

// Send to signer API
const sendResponse = await fetch("/api/approve-signer/send", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    signTypedDataParams: typedData,
    authorSignature,
    authorAddress,
    chainId: 8453,
  }),
});

const { txHash } = await sendResponse.json();
```

#### Revoke Signer

Get nonce, create revoke approval typed data, get author signature, then send to signer API which submits the transaction and pays for gas.

```typescript
import { createRemoveApprovalTypedData, getNonce } from "@ecp.eth/sdk/comments";

// Get nonce for revoke approval
const nonce = await getNonce({
  author: authorAddress,
  app: appSignerAddress,
  readContract: publicClient.readContract,
});

// Create revoke approval typed data
const typedData = createRemoveApprovalTypedData({
  author: authorAddress,
  app: appSignerAddress,
  nonce,
  chainId: 8453,
});

// Get author signature
const authorSignature = await userWallet.signTypedData(typedData);

// Send to signer API
const sendResponse = await fetch("/api/revoke-signer/send", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    signTypedDataParams: typedData,
    authorSignature,
    authorAddress,
    chainId: 8453,
  }),
});

const { txHash } = await sendResponse.json();
```

## Error Handling

- **400 Bad Request**: Invalid request data
- **404 Not Found**: Gasless endpoint not configured
- **500 Internal Server Error**: Server-side error

## Development

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Type checking
pnpm check-types

# Linting
pnpm lint
```

## License

MIT
