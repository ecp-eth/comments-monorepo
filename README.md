# Ethereum Comments Protocol

A protocol for commenting, built on Ethereum.
[ethcomments.xyz](https://ethcomments.xyz) | [docs](https://docs.ethcomments.xyz)

## Monorepo

This monorepo contains all the auxilliary tools and libraries of the Ethereum Comments Protocol.

### Apps (`/apps`)

- `indexer/` - Ponder.sh based blockchain indexer service for ECP
- `demo/` - Main demo application showcasing ECP integration
- `embed/` - Embeddable components for ECP
- `homepage/` - Project homepage and documentation


### Examples (`/examples`)

- `embed-demo-blog/` - Demo blog with embedded ECP comments
- `demo-rn-expo/` - React Native demo application
- `signer/` - Minimal boilerplate for deploying your own signer API 

### Packages (`/packages`)

- `protocol/` - Smart contracts and core protocol implementation
- `sdk/` - TypeScript/JavaScript SDK for ECP integration
- `shared/` - Shared utilities and types
- `build-tools/` - Build and development tooling
- `test-protocol/` - Protocol testing utilities
- `eslint-config/` - Shared ESLint configuration
- `typescript-config/` - Shared TypeScript configuration

### Documentation (`/docs`)

- Protocol documentation
- Integration guides
- API references

## Development

To get started with development, copy the `.env.example` files in each package to `.env` and fill in the values in each of the projects inside of `apps`, as well as `packages/protocol`

Then, install dependencies and run the development server:

```bash
pnpm install
pnpm dev
```

This will start a local anvil node, deploy the contracts, start the indexer with API, and a demo frontend that integrates ECP.

### Set up guide for Swap example

#### Demo app:

If you are running locally, you need to make sure you are using a chain that:

- supports EIP 7702
- our contract is deployed on it
- supports [0x swaps](https://0x.org)

Then make sure you are using that chain in the demo app. In `lib/wagmi.ts` change the `chain` to the chain you are using.

**Important: We used Metamask and `base` to test the EIP 7702. Make sure that chain you are testing is also supported by Metamask.**

#### Indexer:

Based on chain you choose, you need to provide `PONDER_RPC_URL_{chain_id}` in `.env` file to enable indexing of the chain.

# License

[MIT](LICENSE)
