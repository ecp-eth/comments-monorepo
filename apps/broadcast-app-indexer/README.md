# Broadcast App Indexer

A specialized [Ponder](https://ponder.sh/) based indexer service that indexes broadcast channel events and manages notifications for Farcaster mini apps. It processes channel creation, updates, and comment events from the broadcast channel protocol smart contracts.

## Overview

The Broadcast App Indexer monitors `BroadcastHook`, `ChannelManager`, and `CommentManager` contract events specifically for broadcast channel activities. It provides the following features:

- Indexes broadcast channel creation and management events
- Tracks channel ownership transfers and metadata updates
- Processes top-level comments for notification triggers
- Manages subscription-based notifications for Farcaster users
- Supports multiple mini app configurations with isolated notification settings
- Provides REST API endpoints for querying indexed broadcast channel data

## Architecture

This indexer works with three main smart contracts:

- **BroadcastHook**: Handles channel creation events
- **ChannelManager**: Manages channel ownership and metadata updates
- **CommentManager**: Processes comment events for notification triggers

The indexer integrates with:

- **Neynar API**: For sending notifications to Farcaster users
- **Farcaster QuickAuth**: For mini app authentication
- **PostgreSQL**: For data storage and notification queue management

## Self Hosting

### Prerequisites

- Node.js 22+
- pnpm package manager
- PostgreSQL database
- Access to Base or Anvil (local) Ethereum nodes
- Neynar API key (for notifications)

### Installation

1. Clone the repository and navigate to the broadcast-app-indexer:

```bash
cd apps/broadcast-app-indexer
```

2. Install dependencies:

```bash
pnpm install
```

3. Set up environment variables by creating `.env.local`:

```bash
cp .env.example .env.local
```

4. Configure your environment variables (see Environment Variables section below)

### Development

Start the development server:

```bash
pnpm run dev
```

The indexer will be available at `http://localhost:42070`

### Production

Generate and run database migrations, then start the production server:

```bash
pnpm run start
```

## Environment Variables

### Required Variables

**Database Configuration:**

```bash
# PostgreSQL connection string
DATABASE_URL=postgres://ponder:ponder@localhost:5432/ponder

# Database schema for broadcast app tables
DATABASE_SCHEMA=broadcast_app_indexer
```

**Mini App Configuration:**
For each supported mini app, configure the following (replace `1` with app number):

```bash
# Mini app URL where the app is hosted
BROADCAST_MINI_APP_1_URI="http://localhost:3000"

# Neynar API key for this specific app (falls back to global if not set)
BROADCAST_MINI_APP_1_NEYNAR_API_KEY=""

# App signer public key for this mini app
BROADCAST_MINI_APP_1_APP_SIGNER_ADDRESS=""

# Notification target URL with variables {channelId} and {commentId}
BROADCAST_MINI_APP_1_NOTIFICATION_URI="http://localhost:3000/channels/{channelId}"
```

**Blockchain Configuration:**
At least one chain configuration is required:

For Anvil (local development):

```bash
CHAIN_ANVIL_BROADCAST_HOOK_ADDRESS=0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e
CHAIN_ANVIL_RPC_URL=http://localhost:8545
```

For Base Mainnet:

```bash
CHAIN_BASE_BROADCAST_HOOK_ADDRESS=
CHAIN_BASE_RPC_URL=
CHAIN_BASE_BROADCAST_HOOK_START_BLOCK=
CHAIN_BASE_CHANNEL_MANAGER_START_BLOCK=
CHAIN_BASE_COMMENT_MANAGER_START_BLOCK=
```

### Optional Variables

```bash
# Sentry DSN for error tracking
SENTRY_DSN=

# Global Neynar API key (used if app-specific key not provided)
NEYNAR_API_KEY=

# Notification isolation setting (1 = only app's own comments, 0 = all comments)
BROADCAST_MINI_APP_1_ISOLATE_NOTIFICATIONS="1"
```

## Multi-App Support

The indexer supports multiple mini apps simultaneously. To add additional apps, increment the number in the environment variable names:

```bash
# Second mini app
BROADCAST_MINI_APP_2_URI="https://app2.example.com"
BROADCAST_MINI_APP_2_NEYNAR_API_KEY=""
BROADCAST_MINI_APP_2_APP_SIGNER_ADDRESS=""
BROADCAST_MINI_APP_2_NOTIFICATION_URI="https://app2.example.com/channels/{channelId}"

# Third mini app
BROADCAST_MINI_APP_3_URI="https://app3.example.com"
# ... and so on
```

## Notification System

The indexer includes a sophisticated notification system that:

1. **Monitors Comments**: Listens for top-level comments on broadcast channels
2. **Manages Subscriptions**: Tracks user subscriptions to specific channels
3. **Isolates Apps**: Can send notifications only for comments from specific apps or all apps
4. **Queue Management**: Uses a database queue for reliable notification delivery
5. **Retry Logic**: Automatically retries failed notifications with exponential backoff

Notifications are sent via the Neynar API to Farcaster users who have subscribed to specific channels.

## API Endpoints

The indexer provides REST API endpoints for:

- Querying indexed channel data
- Managing channel subscriptions
- Authentication via Farcaster QuickAuth
- Channel and comment metadata

Access the API documentation at `http://localhost:42070` when running locally.

## Database Schema

The indexer maintains several key tables:

- `channel`: Broadcast channel metadata and ownership
- `channelSubscription`: User subscriptions to channels
- `neynarNotificationServiceQueue`: Notification delivery queue

## Development Commands

```bash
# Generate database migrations
pnpm run db:migrate:generate

# Apply database migrations
pnpm run db:migrate:up

# Start development server
pnpm run dev

# Type checking
pnpm run check-types

# Linting
pnpm run lint

# Testing
pnpm run test

# Sync broadcast hook ABI
pnpm run sync:broadcast-hook:abi
```

## Monitoring

The indexer integrates with Sentry for error tracking and monitoring. Configure the `SENTRY_DSN` environment variable to enable error reporting.

## Deployment

For production deployment, ensure:

1. PostgreSQL database is properly configured and accessible
2. All required environment variables are set
3. Neynar API keys have sufficient quota for notification volume
4. Database migrations are applied before starting the service
5. Consider using a process manager like PM2 for production deployments
