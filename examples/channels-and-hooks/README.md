# Channels and Hooks Examples

This directory contains examples of creating channels and hooks using both the TypeScript SDK and Solidity scripts.

## Setup

1. Get [pnpm](https://pnpm.io/) installed.
1. Create a copy of `.env` file by copying the content from `.env.example`, follow the instruction to set it up.
1. Install dependencies by running: `pnpm install`.
1. Optional: You may want to test against a local anvil node.
   1. To setup and run anvil locally, see [Anvil document](https://book.getfoundry.sh/anvil/).
   1. Follow the `README.md` file in [protocol folder](../../packages/protocol/) to deploy the contracts to anvil node

## TypeScript Examples

The TypeScript examples use the `@ecp.eth/sdk` package to interact with the protocol.

Create a channel:

```bash
npm run create-channel
```

## Solidity Examples

The Solidity examples use Foundry to interact with the protocol directly.

### Setup

1. Ensure Foundry is installed:

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

### Running the Examples

Create a channel:

```bash
forge script solidity/CreateChannel.s.sol --rpc-url $RPC_URL --broadcast
```

Replace `$RPC_URL` with the url of RPC node for the target chain.

## Notes

- DO NOT use your real wallet or private key for testing
- Make sure you have enough ETH to pay for the channel creation fee
- The private key should be kept secure and never committed to version control
- The examples use the mainnet network by default
