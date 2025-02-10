# ECP Indexer

The ECP (Ethereum Comments Protocol) Indexer is a service that indexes and processes comments from the Ethereum blockchain according to the Ethereum Comments Protocol specification. It provides REST API endpoints that allow clients to efficiently query and access the indexed comment data.

## Overview

The ECP Indexer monitors Ethereum events for comment-related activities and processes them into a queryable database. It supports the following features:

- Indexes comments from ECP-compatible smart contracts
- Processes comment metadata and content
- Maintains relationships between comments (replies, threads)
- Handles comment updates and deletions
- Provides REST API endpoints for querying indexed comments

## Getting Started

### Prerequisites

- Node.js + pnpm
- Access to an Ethereum node (e.g., Infura)
- PostgreSQL database - SQLite will be used if not provided

### Installation

1. Clone the repository
2. Install dependencies:

```bash
pnpm install
```

3. Set up environment variables in `.env` or `.env.local` for local development:

```bash
cp .env.example .env
```

4. Configure your database and Ethereum node connection in `.env`

### Start development server

```bash
pnpm run dev
```

### Start production server

```bash
pnpm run start
```

### Deployment on Railway

To deploy indexer to Railway, follow below steps:

1. Create a new Railway project and connect it to your GitHub repository.
2. (Optional) Create a new PostgreSQL database and connect it to the project via `DATABASE_URL` environment variable reference .
3. Then you need to configure the following environment variables:
    - `DATABASE_URL`: PostgreSQL connection string
    - `PONDER_RPC_URL_[chain id]`: Ethereum node RPC URL for the chain you want to index, you can add multiple RPC URLs for different chains.
    - `PONDER_START_BLOCK_[chain id]`: Block number for indexer to start from.

5. Nixpacks on Railway by default uses npm, ECP uses pnpm instead, so in order to make it respect the lock files, we also need below environment variables:
    - `NIXPACKS_INSTALL_CMD`: set value to `pnpm install --frozen-lockfile` to use pnpm to install dependencies.
    - `NIXPACKS_BUILD_CMD`: set value to `pnpm run build` to tell nixpacks to use pnpm to build.
    - `NIXPACKS_START_CMD`: set value to `cd apps/indexer/ && pnpm run start --schema $RAILWAY_DEPLOYMENT_ID` to start indexer.
