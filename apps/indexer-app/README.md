# Ethereum Comments Protocol Dashboard App

The Ethereum Comments Protocol Dashboard App is a [Next.js](https://nextjs.org/) management dashboard that enables developers to manage their applications and webhooks for [Ethereum Comments Protocol](https://docs.ethcomments.xyz/) events. Monitor webhook deliveries, view analytics, and configure event subscriptions through an intuitive web interface. Visit [dashboard.ethcomments.xyz](https://dashboard.ethcomments.xyz) to use the app.

## Features

- **Application Management**: Create, update, and delete applications with secure API key management
- **Webhook Configuration**: Set up webhooks with custom URLs, authentication, and event filtering
- **Event Subscriptions**: Subscribe to various ECP events like comments, channels, approvals, and more
- **Analytics Dashboard**: Comprehensive webhook delivery analytics with success rates, latency metrics, and error tracking
- **Delivery Monitoring**: Real-time monitoring of webhook delivery attempts and responses
- **Authentication**: Secure Sign-In with Ethereum (SIWE) authentication
- **Wallet Integration**: Connect with popular Web3 wallets via RainbowKit

## Development

### Prerequisites

- Node.js 18+ and pnpm
- Access to an Ethereum RPC endpoint
- WalletConnect Project ID for wallet integration

### Installation

1. Clone the repository
2. Install dependencies:

```bash
pnpm install
```

### Development Setup

**Important**: Before starting development, you need to build the required workspace packages:

```bash
# From the monorepo root
pnpm build --filter @ecp.eth/sdk
pnpm build --filter @ecp.eth/shared

# Or build all packages
pnpm build
```

### Local Development

### Only indexer app

```bash
# Navigate to the indexer-app directory
cd apps/indexer-app

# Start the development server
pnpm dev
```

This will start the development server at [http://localhost:3007](http://localhost:3007).

### With indexer

In monorepo root:

```bash
pnpm dev:indexer-app
```

Make sure you first build packages.

This will start the development server at [http://localhost:3007](http://localhost:3007).

### Backend Configuration

The indexer app requires a running ECP indexer backend to function properly. You have two options:

1. **Use the hosted indexer** (recommended for development):

   ```bash
   # Set in your .env.local
   NEXT_PUBLIC_INDEXER_URL=https://api.ethcomments.xyz
   ```

2. **Run a local indexer**:
   - Follow the [indexer deployment guide](../indexer/README.md) to set up a local indexer
   - Update your environment variables to point to your local instance

### Environment Variables

Copy `.env.example` to `.env.local` and configure the following environment variables:

#### Required Variables

| Variable                    | Description                                                                                |
| --------------------------- | ------------------------------------------------------------------------------------------ |
| `NEXT_PUBLIC_RPC_URL`       | Ethereum RPC endpoint URL for blockchain interactions                                      |
| `NEXT_PUBLIC_WC_PROJECT_ID` | WalletConnect Project ID for wallet integration (get from https://cloud.walletconnect.com) |
| `NEXT_PUBLIC_CHAIN_ID`      | Supported chain ID (e.g., 1 for Ethereum mainnet, 31337 for Anvil (local), 8453 for Base)  |

#### Optional Variables

| Variable                  | Description                                                   |
| ------------------------- | ------------------------------------------------------------- |
| `NEXT_PUBLIC_INDEXER_URL` | URL to ECP indexer API (default: https://api.ethcomments.xyz) |
| `NEXT_PUBLIC_SENTRY_DSN`  | Sentry DSN for error tracking and monitoring                  |

### Available Scripts

- `pnpm dev`: Start the development server with hot reload
- `pnpm build`: Create a production build of the application
- `pnpm start`: Start the production server (requires build first)
- `pnpm lint`: Run ESLint to check for code quality issues
- `pnpm check-types`: Run TypeScript type checking

### Build

To create a production build:

```bash
pnpm build
```

To start the production server:

```bash
pnpm start
```

## Key Features

### Application Management

- Create and manage multiple applications
- Secure API key generation and rotation
- Application deletion and updates

### Webhook Configuration

- Set up webhook endpoints for ECP events
- Configure authentication (HTTP Basic Auth, Header-based, or No Auth)
- Filter events by type (comments, channels, approvals, etc.)
- Test webhook endpoints with sample payloads

### Supported Events

The app supports webhooks for the following ECP events:

- `approval:added` / `approval:removed`
- `channel:created` / `channel:updated` / `channel:transferred`
- `channel:hook:status:updated` / `channel:metadata:set`
- `comment:added` / `comment:deleted` / `comment:edited`
- `comment:hook:metadata:set` / `comment:moderation:status:updated`
- `comment:reactions:updated`

### Analytics Dashboard

- **Delivery Metrics**: Track successful and failed webhook deliveries
- **Performance Monitoring**: Monitor end-to-end latency and response times
- **Error Analysis**: Detailed error breakdown and debugging information
- **Success Rates**: First-attempt and eventual success rate tracking
- **SLA Monitoring**: Service level agreement compliance tracking
- **Time-based Analytics**: View metrics over 1 day, 7 days, 30 days, or 90 days

## Architecture

The indexer app is built with modern web technologies:

- **Next.js 15**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first CSS framework
- **Radix UI**: Accessible component primitives
- **RainbowKit**: Web3 wallet integration
- **Wagmi**: Ethereum wallet and contract interactions
- **TanStack Query**: Data fetching, caching, and synchronization
- **React Hook Form**: Form state management and validation
- **Recharts**: Data visualization for analytics
- **Zod**: Runtime type validation

## Related Links

- [ECP Dashboard App](https://dashboard.ethcomments.xyz)
- [Ethereum Comments Protocol Documentation](https://docs.ethcomments.xyz/)
- [Source code](https://github.com/ecp-eth/comments-monorepo/tree/main/apps/indexer-app)
