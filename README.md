# Ethereum Comments Protocol

A protocol for commenting built on Ethereum.

## Deployments

| Network | Block Number | Address                                    |
| ------- | ------------ | ------------------------------------------ |
| Base    | 26637776     | 0x4b2fdb900fd003e30919e612d75046823b879554 |

## Packages

- `@ecp.eth/sdk`: SDK for integrating ECP into your project.
- `@ecp.eth/indexer`: Indexer and API for ECP across all chains.
- `@ecp.eth/protocol`: Smart contracts for ECP.

## Development

To get started with development, copy the `.env.example` files in each package to `.env` and fill in the values in each of the projects inside of `apps`, as well as `packages/protocol`

Then, install dependencies and run the development server:

```bash
pnpm install
pnpm dev
```

This will start a local anvil node, deploy the contracts, start the indexer with API, and a demo frontend that integrates ECP.
