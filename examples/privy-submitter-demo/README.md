This is a demo app for the Ethereum Comments Protocol that uses [Privy Server Wallets]([text](https://docs.privy.io/guide/server-wallets/)) to submit comments to the blockchain.

## Getting Started

### Privy Setup

1. Create a new Privy app
2. Create an Authorization Key
3. Create a Server Wallet
4. Fund the Server Wallet with ETH for submitting transactions.

### Environment Variables

Copy the `.env.example` file to `.env` and add the required variables.

### Running the app

```bash
pnpm install
pnpm dev
```

This will start the app on `http://localhost:3000`. 

## Integration Details

The Privy wallet is set up in the `src/lib/privy.ts` file using the environment variables. The app then uses the `submitterAccount` to relay comments/deletions to the blockchain.




