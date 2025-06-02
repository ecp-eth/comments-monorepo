## Comments Protocol

This is a simple comments protocol built on Ethereum. It allows users to comment on URLs.

## Requirements

- [Foundry](https://getfoundry.sh/)
- [pnpm](https://pnpm.io/)

## Development

Install dependencies:

```
pnpm install
```

Create a `.env` file and update variables

```
cp .env.example .env
```

Run anvil node:

```
pnpm run node
```

Run the dev script to deploy the contract to anvil:

```
pnpm run dev
```

See `broadcast/dev.s.sol/31337/run-latest.json` for the deployed contract address in the `contractAddress` field.

Now you can interact with the contract on network `http://localhost:8545` using the contract address.

## Testing

```
pnpm run test
```

## Deployment

Fund the wallet on the network you want to deploy to.

Ensure that etherscan API key is set in the `.env` file.

```
pnpm run deploy:prod --rpc-url $RPC_URL
```

## Get contract addresses on different environment

You can run simulation using below commands to get contract address on respective environment:

```
pnpm run deploy:prod:simulation
pnpm run deploy:dev:simulation
```

The prod simulation uses the deployment account address to generate contract address.
The dev simulation assumes we are going to use default anvil test account for local development.
