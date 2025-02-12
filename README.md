# Ethereum Comments Protocol

A protocol for commenting built on Ethereum.

## Deployments

| Network | Block Number | Address |
|---------|--------------|---------|
| Base | 26283365 | 0xfed9b3a3884940d0c8a91b55f5e631b33a84f669 |

## Packages

- `@ecp.eth/sdk`: SDK for integrating ECP into your project.
- `@ecp.eth/indexer`: Indexer and API for ECP across all chains.
- `@ecp.eth/protocol`: Smart contracts for ECP.

## Development

To get started with development, copy the `.env.example` files in each package to `.env` and fill in the values.

Then, install dependencies and run the development server:

```bash
pnpm install
pnpm dev
```

This will start a local anvil node, deploy the contracts, start the indexer with API, and a demo frontend that integrates ECP.