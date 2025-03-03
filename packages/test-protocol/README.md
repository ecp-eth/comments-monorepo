## Test Protocl

This is simple protocol for testing purposes of tx calldata suffixes.

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
forge test
```

## Deployment

Fund the wallet on the network you want to deploy to.

Ensure that etherscan API key is set in the `.env` file.

```
pnpm run deploy --rpc-url $RPC_URL
```
