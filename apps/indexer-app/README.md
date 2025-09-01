# Ethereum Comments Protocol Indexer App

Ethereum Comments Protocol Indexer App is a [Next.js](https://nextjs.org/) app built on the [Ethereum Comments Protocol](https://docs.ethcomments.xyz/) that enables users to build their apps on ECP.

## Features

- **Channel Discovery**: Browse and discover public broadcast channels
- **Channel Creation**: Create new channels with custom descriptions and metadata
- **Commenting System**: Real-time commenting and discussion within channels
- **Farcaster Integration**: Native integration with Farcaster ecosystem via mini app framework
- **Wallet Integration**: Seamless Web3 wallet connectivity
- **Gasless Transactions**: App signer implementation for improved user experience
- **Real-time Updates**: Live comment feeds and channel activity

## Development

### Prerequisites

- Node.js + pnpm
- Access to an Ethereum node (for contract interactions)
- Farcaster account (for testing mini app functionality)

### Installation

1. Clone the repository
2. Install dependencies:

```bash
pnpm install
```

### Development Setup

**Important**: Before starting development, you need to build the required workspace packages:

```bash
# Build SDK package
cd packages/sdk
pnpm build

# Build Shared package
cd ../shared
pnpm build

# Build React Editor package
cd ../react-editor
pnpm build

# Return to broadcast-app directory
cd ../../apps/broadcast-app
```

### Local Development

```bash
pnpm dev
```

This will start the development server at [http://localhost:3005](http://localhost:3005).

### Testing with Farcaster Mini App

**Recommended Approach**: For testing the app within the Farcaster mini app preview, it's highly recommended to deploy the indexer service rather than running it locally. Local testing becomes complex because you would need at least 3 separate tunnels:

1. One for the broadcast-app
2. One for the indexer
3. One for any additional services

**Better approach**:

1. Deploy the indexer to a cloud service (see [indexer deployment guide](../indexer/README.md))
2. Use a single tunnel (e.g., ngrok) for the broadcast-app only:
   ```bash
   ngrok http 3005
   ```
3. Configure the app to use the deployed indexer URL
4. Test using the Farcaster mini app preview with your ngrok URL

### Environment Variables

Copy `.env.example` to `.env.local` and configure the following environment variables:

#### Required Variables

| Variable                                                    | Description                                                                                                       |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_BROADCAST_APP_INDEXER_URL`                     | URL to Broadcast App Indexer to fetch comments and subscribe to channel updates (default: http://localhost:42070) |
| `NEXT_PUBLIC_BROADCAST_HOOK_ADDRESS`                        | Address of the broadcast hook contract to check for eligibility to create channels                                |
| `FARCASTER_MINI_APP_MANIFEST_ACCOUNT_ASSOCIATION_HEADER`    | Account association header (generate at https://farcaster.xyz/~/developers/mini-apps/manifest)                    |
| `FARCASTER_MINI_APP_MANIFEST_ACCOUNT_ASSOCIATION_PAYLOAD`   | Account association payload (generate at https://farcaster.xyz/~/developers/mini-apps/manifest)                   |
| `FARCASTER_MINI_APP_MANIFEST_ACCOUNT_ASSOCIATION_SIGNATURE` | Account association signature (generate at https://farcaster.xyz/~/developers/mini-apps/manifest)                 |
| `FARCASTER_MINI_APP_NAME`                                   | Farcaster mini app name (e.g., "Broadcast App")                                                                   |
| `FARCASTER_MINI_APP_URL`                                    | Farcaster mini app URL                                                                                            |
| `FARCASTER_MINI_APP_WEBHOOK_URL`                            | Notifications webhook. Must be public HTTPS URL (use ngrok or localtunnel for local dev)                          |
| `NEXT_PUBLIC_PINATA_GATEWAY_URL`                            | Pinata gateway URL for file uploads                                                                               |
| `PINATA_JWT`                                                | Pinata JWT token for file uploads                                                                                 |
| `APP_SIGNER_PRIVATE_KEY`                                    | App identity signer private key (generate using `./scripts/generate-app-signer.ts`)                               |
| `NEXT_PUBLIC_APP_SIGNER_ADDRESS`                            | Address of the signer private key (output from generate-app-signer.ts)                                            |
| `NEXT_PUBLIC_RPC_URL`                                       | Ethereum RPC node URL used on client-side                                                                         |
| `PRIVATE_RPC_URL`                                           | Ethereum RPC node URL used on server-side                                                                         |

#### Optional Variables

| Variable                       | Description                                                                                 |
| ------------------------------ | ------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_INDEXER_URL`      | URL to public indexer to read comments for a channel (default: https://api.ethcomments.xyz) |
| `COMMENT_CONTENT_LENGTH_LIMIT` | Comment content length limit (default: 10240)                                               |
| `SENTRY_ORG`                   | Sentry organization for error tracking                                                      |
| `SENTRY_PROJECT`               | Sentry project for error tracking                                                           |
| `NEXT_PUBLIC_SENTRY_DSN`       | Sentry DSN for error tracking                                                               |
| `SENTRY_AUTH_TOKEN`            | Sentry authentication token                                                                 |

### Scripts

The app includes several utility scripts in the `scripts/` directory:

- `create-channel.ts`: Create a new broadcast channel
- `generate-app-signer.ts`: Generate app signer keys
- `post-comment.ts`: Post a comment to a channel

### Build

To create a production build:

```bash
pnpm build
```

To start the production server:

```bash
pnpm start
```

## Architecture

The broadcast-app leverages several key components:

- **Ethereum Comments Protocol**: Core commenting infrastructure
- **Farcaster Mini App SDK**: Integration with Farcaster ecosystem
- **React Editor**: Rich text editing capabilities
- **Wagmi**: Ethereum wallet and contract interactions
- **TanStack Query**: Data fetching and caching

## Related Links

- [Ethereum Comments Protocol Documentation](https://docs.ethcomments.xyz/)
- [Farcaster Mini Apps Documentation](https://miniapps.farcaster.xyz)
- [Source code](https://github.com/ecp-eth/comments-monorepo/tree/main/apps/broadcast-app)
