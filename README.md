# Ethereum Comments Protocol

A protocol for commenting built on Ethereum.

## Deployments

| Network          | Contract Address                           |
| ---------------- | ------------------------------------------ |
| Ethereum Mainnet | 0xabD9cE1952992211dEe051Df6ed337fa6efC995d |
| Ethereum Sepolia | 0xabD9cE1952992211dEe051Df6ed337fa6efC995d |
| Base             | 0xabD9cE1952992211dEe051Df6ed337fa6efC995d |
| Base Sepolia     | 0xabD9cE1952992211dEe051Df6ed337fa6efC995d |
| World Chain      | 0xabD9cE1952992211dEe051Df6ed337fa6efC995d |

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
