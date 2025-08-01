[deploy-vercel]: https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fecp-eth%2Fcomments-monorepo%2Ftree%2Ftemplate-signer-api&env=RPC_URL_8453,APP_SIGNER_PRIVATE_KEY,COMMENTS_INDEXER_URL&envDescription=For%20detailed%20Environment%20Variables%20configuration%20please%20see%3A&envLink=https%3A%2F%2Fdocs.ethcomments.xyz%2Fdemos%2Fsigner-api-service%23environment-variables&project-name=signer-api-service&repository-name=signer-api-service "1 click deploy to Vercel"

# ECP Comments Signer

A Next.js API service for signing ECP comments. Provides both standard signing and gasless signing endpoints for posting, editing, and deleting comments.

[![Deploy with Vercel](https://vercel.com/button)][deploy-vercel]

## Features

- **Standard Signing**: Sign comments with app signature
- **Gasless Signing**: Submit comments without user gas costs
- **Approval Checking**: Automatically submit comments if user has approved the app
- **Edit Comment Support**: Sign and submit comment edits
- **Delete Comment Support**: Sign and submit comment deletions
- **Multi-Chain Support**: Configure multiple chains with individual RPC URLs
- **Conditional Endpoints**: Gasless endpoint only available when properly configured
- **Type Safety**: Full TypeScript support with Zod validation
- **Vercel Ready**: Optimized for Vercel deployment

## Quick Start

1. **Clone and install dependencies:**

   ```bash
   git clone https://github.com/ecp-eth/comments-monorepo.git
   cd apps/signer
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

- `APP_SIGNER_PRIVATE_KEY`: Private key for app signer used to sign comments using `/api/sign`. If not set, the endpoint will return 404
- `COMMENTS_INDEXER_URL`: Comments indexer URL for muted account checking. If not set, the check is disabled

### Gasless Configuration

For gasless (sponsored) transactions, you can use either private key method or Privy method. If both are configured, the private key method will be used.

#### Method Selection

- `GASLESS_METHOD`: Which method to use for preparing and sending comments
  - `"private-key"`: Uses `GASLESS_APP_SIGNER_PRIVATE_KEY` + `GASLESS_SUBMITTER_PRIVATE_KEY`
  - `"privy"`: Uses `GASLESS_PRIVY_APP_SIGNER_PRIVATE_KEY` + `GASLESS_PRIVY_*` variables
  - If not set, gasless endpoints will return 404

#### Private Key Method (`"private-key"`)

- `GASLESS_APP_SIGNER_PRIVATE_KEY`: Used to sign comment data using `/api/post-comment/gasless/prepare` endpoint. If not set, `GASLESS_SUBMITTER_PRIVATE_KEY` will be used
- `GASLESS_SUBMITTER_PRIVATE_KEY`: **Required** - Used to send signed comment data using `/api/post-comment/gasless/send` endpoint

#### Privy Method (`"privy"`)

- `GASLESS_PRIVY_APP_SIGNER_PRIVATE_KEY`: Used to sign comment data using `/api/post-comment/gasless/prepare` endpoint. If not set, the Privy account is used to sign
- `GASLESS_PRIVY_APP_ID`: **Required** - Privy app ID
- `GASLESS_PRIVY_SECRET`: **Required** - Privy secret
- `GASLESS_PRIVY_AUTHORIZATION_KEY`: **Required** - Privy authorization key
- `GASLESS_PRIVY_WALLET_ADDRESS`: **Required** - Privy wallet address
- `GASLESS_PRIVY_WALLET_ID`: **Required** - Privy wallet ID

## API Endpoints

### POST /api/post-comment/sign

Standard comment signing endpoint. Always available when `APP_SIGNER_PRIVATE_KEY` is configured.

**Request:**

```json
{
  "author": "0x1234567890abcdef1234567890abcdef1234567890",
  "content": "Your comment text",
  "metadata": [],
  "targetUri": "https://example.com"
}
```

**Response:**

```json
{
  "signature": "0x...",
  "hash": "0x...",
  "data": {
    "id": "0x...",
    "content": "Your comment text",
    "author": "0x1234567890abcdef1234567890abcdef1234567890",
    "app": "0x...",
    "targetUri": "https://example.com",
    "metadata": [],
    "timestamp": "1234567890"
  }
}
```

### POST /api/post-comment/gasless/prepare

Prepare gasless comment data. Returns 404 if gasless method is not configured.

**Request:**

```json
{
  "author": "0x1234567890abcdef1234567890abcdef1234567890",
  "content": "Your comment text",
  "metadata": [],
  "targetUri": "https://example.com",
  "submitIfApproved": true
}
```

**Response (Not Approved):**

```json
{
  "signTypedDataParams": { ... },
  "id": "0x...",
  "appSignature": "0x...",
  "commentData": { ... },
  "chainId": 1
}
```

**Response (Approved and Submitted):**

```json
{
  "txHash": "0x...",
  "id": "0x...",
  "appSignature": "0x...",
  "commentData": { ... },
  "chainId": 1
}
```

### POST /api/post-comment/gasless/send

Send signed gasless comment data. Returns 404 if gasless method is not configured.

**Request:**

```json
{
  "signTypedDataParams": { ... },
  "appSignature": "0x...",
  "authorSignature": "0x...",
  "chainId": 1
}
```

**Response:**

```json
{
  "txHash": "0x..."
}
```

## Edit Comment Endpoints

### POST /api/edit-comment/sign

Standard edit comment signing endpoint. Always available when `APP_SIGNER_PRIVATE_KEY` is configured.

**Request:**

```json
{
  "commentId": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
  "content": "Updated comment text",
  "author": "0x1234567890abcdef1234567890abcdef1234567890",
  "metadata": [],
  "chainId": 1
}
```

**Response:**

```json
{
  "signature": "0x...",
  "hash": "0x...",
  "data": {
    "commentId": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    "content": "Updated comment text",
    "app": "0x...",
    "nonce": "1234567890",
    "deadline": "1234567890",
    "metadata": []
  }
}
```

### POST /api/edit-comment/gasless/prepare

Prepare gasless edit comment data. Returns 404 if gasless method is not configured.

**Request:**

```json
{
  "commentId": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
  "content": "Updated comment text",
  "author": "0x1234567890abcdef1234567890abcdef1234567890",
  "metadata": [],
  "submitIfApproved": true,
  "chainId": 1
}
```

**Response (Not Approved):**

```json
{
  "signTypedDataParams": { ... },
  "appSignature": "0x...",
  "chainId": 1,
  "edit": { ... }
}
```

**Response (Approved and Submitted):**

```json
{
  "txHash": "0x...",
  "appSignature": "0x...",
  "chainId": 1,
  "edit": { ... }
}
```

### POST /api/edit-comment/gasless/send

Send signed gasless edit comment data. Returns 404 if gasless method is not configured.

**Request:**

```json
{
  "signTypedDataParams": { ... },
  "appSignature": "0x...",
  "authorSignature": "0x...",
  "edit": { ... },
  "chainId": 1
}
```

**Response:**

```json
{
  "txHash": "0x..."
}
```

## Delete Comment Endpoints

### POST /api/delete-comment/gasless/prepare

Prepare gasless delete comment data. Returns 404 if gasless method is not configured.

**Request:**

```json
{
  "author": "0x1234567890abcdef1234567890abcdef1234567890",
  "commentId": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
  "submitIfApproved": true,
  "chainId": 1
}
```

**Response (Not Approved):**

```json
{
  "signTypedDataParams": { ... },
  "appSignature": "0x..."
}
```

**Response (Approved and Submitted):**

```json
{
  "txHash": "0x..."
}
```

### POST /api/delete-comment/gasless/send

Send signed gasless delete comment data. Returns 404 if gasless method is not configured.

**Request:**

```json
{
  "signTypedDataParams": { ... },
  "appSignature": "0x...",
  "authorSignature": "0x...",
  "chainId": 1
}
```

**Response:**

```json
{
  "txHash": "0x..."
}
```

## Usage Examples

### cURL - Standard Signing

```bash
curl -X POST http://localhost:3000/api/post-comment/sign \
  -H "Content-Type: application/json" \
  -d '{
    "author": "0x1234567890abcdef1234567890abcdef1234567890",
    "content": "Hello, world!",
    "metadata": [],
    "targetUri": "https://example.com"
  }'
```

### cURL - Gasless Prepare

```bash
curl -X POST http://localhost:3000/api/post-comment/gasless/prepare \
  -H "Content-Type: application/json" \
  -d '{
    "author": "0x1234567890abcdef1234567890abcdef1234567890",
    "content": "Hello, world!",
    "metadata": [],
    "targetUri": "https://example.com",
    "submitIfApproved": true
  }'
```

### cURL - Gasless Send

```bash
curl -X POST http://localhost:3000/api/post-comment/gasless/send \
  -H "Content-Type: application/json" \
  -d '{
    "signTypedDataParams": { ... },
    "appSignature": "0x...",
    "authorSignature": "0x...",
    "chainId": 1
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
    "chainId": 1
  }'
```

### cURL - Edit Comment Gasless Prepare

```bash
curl -X POST http://localhost:3000/api/edit-comment/gasless/prepare \
  -H "Content-Type: application/json" \
  -d '{
    "commentId": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    "content": "Updated comment text",
    "author": "0x1234567890abcdef1234567890abcdef1234567890",
    "metadata": [],
    "submitIfApproved": true,
    "chainId": 1
  }'
```

### cURL - Edit Comment Gasless Send

```bash
curl -X POST http://localhost:3000/api/edit-comment/gasless/send \
  -H "Content-Type: application/json" \
  -d '{
    "signTypedDataParams": { ... },
    "appSignature": "0x...",
    "authorSignature": "0x...",
    "edit": { ... },
    "chainId": 1
  }'
```

### cURL - Delete Comment Gasless Prepare

```bash
curl -X POST http://localhost:3000/api/delete-comment/gasless/prepare \
  -H "Content-Type: application/json" \
  -d '{
    "author": "0x1234567890abcdef1234567890abcdef1234567890",
    "commentId": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    "submitIfApproved": true,
    "chainId": 1
  }'
```

### cURL - Delete Comment Gasless Send

```bash
curl -X POST http://localhost:3000/api/delete-comment/gasless/send \
  -H "Content-Type: application/json" \
  -d '{
    "signTypedDataParams": { ... },
    "appSignature": "0x...",
    "authorSignature": "0x...",
    "chainId": 1
  }'
```

### TypeScript

```typescript
// Standard signing
const response = await fetch("/api/post-comment/sign", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    author: "0x1234567890abcdef1234567890abcdef1234567890",
    content: "Hello, world!",
    metadata: [],
    targetUri: "https://example.com",
  }),
});

const result = await response.json();
console.log(result.signature);

// Gasless flow with approval checking
const prepareResponse = await fetch("/api/post-comment/gasless/prepare", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    author: "0x1234567890abcdef1234567890abcdef1234567890",
    content: "Hello, world!",
    metadata: [],
    targetUri: "https://example.com",
    submitIfApproved: true, // Check if user has approved the app
  }),
});

const prepareResult = await prepareResponse.json();

// Check if comment was already submitted (user has approval)
if (prepareResult.txHash) {
  console.log("Comment submitted automatically:", prepareResult.txHash);
} else {
  // User needs to sign the data with their wallet
  const userSignature = await userWallet.signTypedData(
    prepareResult.signTypedDataParams,
  );

  // Send the signed data
  const sendResponse = await fetch("/api/post-comment/gasless/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      signTypedDataParams: prepareResult.signTypedDataParams,
      appSignature: prepareResult.appSignature,
      authorSignature: userSignature,
      chainId: 1,
    }),
  });

  const sendResult = await sendResponse.json();
  console.log(sendResult.txHash);
}

// Edit comment - Standard signing
const editResponse = await fetch("/api/edit-comment/sign", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    commentId:
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    content: "Updated comment text",
    author: "0x1234567890abcdef1234567890abcdef1234567890",
    metadata: [],
    chainId: 1,
  }),
});

const editResult = await editResponse.json();
console.log(editResult.signature);

// Edit comment - Gasless flow
const editPrepareResponse = await fetch("/api/edit-comment/gasless/prepare", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    commentId:
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    content: "Updated comment text",
    author: "0x1234567890abcdef1234567890abcdef1234567890",
    metadata: [],
    submitIfApproved: true,
    chainId: 1,
  }),
});

const editPrepareResult = await editPrepareResponse.json();

// If not approved, user needs to sign
if (!editPrepareResult.txHash) {
  const userEditSignature = await userWallet.signTypedData(
    editPrepareResult.signTypedDataParams,
  );

  // Send the signed edit data
  const editSendResponse = await fetch("/api/edit-comment/gasless/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      signTypedDataParams: editPrepareResult.signTypedDataParams,
      appSignature: editPrepareResult.appSignature,
      authorSignature: userEditSignature,
      edit: editPrepareResult.edit,
      chainId: 1,
    }),
  });

  const editSendResult = await editSendResponse.json();
  console.log(editSendResult.txHash);
} else {
  // Already approved and submitted
  console.log(editPrepareResult.txHash);
}

// Delete comment - Gasless flow
const deletePrepareResponse = await fetch(
  "/api/delete-comment/gasless/prepare",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      author: "0x1234567890abcdef1234567890abcdef1234567890",
      commentId:
        "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      submitIfApproved: true,
      chainId: 1,
    }),
  },
);

const deletePrepareResult = await deletePrepareResponse.json();

// If not approved, user needs to sign
if (!deletePrepareResult.txHash) {
  const userDeleteSignature = await userWallet.signTypedData(
    deletePrepareResult.signTypedDataParams,
  );

  // Send the signed delete data
  const deleteSendResponse = await fetch("/api/delete-comment/gasless/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      signTypedDataParams: deletePrepareResult.signTypedDataParams,
      appSignature: deletePrepareResult.appSignature,
      authorSignature: userDeleteSignature,
      chainId: 1,
    }),
  });

  const deleteSendResult = await deleteSendResponse.json();
  console.log(deleteSendResult.txHash);
} else {
  // Already approved and submitted
  console.log(deletePrepareResult.txHash);
}
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
