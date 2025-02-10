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

To deploy indexer to Railway, follow the below steps:

1. Create a new Railway project and connect it to your GitHub repository.
2. Create a new PostgreSQL database and connect it to the project via `DATABASE_URL` environment variable reference or connect it to your own PostgreSQL database.
3. Configure the following environment variables:
    - `DATABASE_URL`: PostgreSQL connection string
    - `PONDER_RPC_URL_[chain id]`: Ethereum node RPC URL for the chain you want to index, you can add multiple RPC URLs for different chains.
    - `PONDER_START_BLOCK_[chain id]`: Block number for indexer to start from (default to 0).

Nixpacks on Railway by default uses `npm` to install dependencies. The ECP repo uses `pnpm` instead. If you want dependency consistency, to make Railway respect the `pnpm` lock files when installing dependencies, follow these steps (larger deployment size and longer deployment time):

1. Configure the below environment variables to use `pnpm`:
    - `NIXPACKS_INSTALL_CMD`: set value to `pnpm install --frozen-lockfile` to use pnpm to install dependencies.
    - `NIXPACKS_BUILD_CMD`: set value to `pnpm run build` to tell nixpacks to use pnpm to build.
    - `NIXPACKS_START_CMD`: set value to `cd apps/indexer/ && pnpm run start --schema $RAILWAY_DEPLOYMENT_ID` to start indexer.

If you don't mind dependency consistencies but prefer faster and smaller deployment, you can do the following:

1. Select the Railway project and then click "Add Root Directory", set the root directory to `apps/indexer`.
2. Under deploy section, configure "Custom start command" to `npm run start --schema $RAILWAY_DEPLOYMENT_ID`
