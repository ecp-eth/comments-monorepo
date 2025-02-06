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
forge test
```
