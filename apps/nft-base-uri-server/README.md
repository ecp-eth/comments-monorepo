# NFT Base URI Server

This is a Next.js server that serves NFT metadata for the ECP Protocol. It provides endpoints to resolve channel metadata from on-chain data.

## Configuration

The server requires the following environment variables:

- `ALLOWED_CHAIN_IDS` - Comma-separated list of chain IDs that the server will support (e.g., "1,137,42161")
- `RPC_URL_[CHAIN_ID]` - RPC URL for each chain ID specified in `ALLOWED_CHAIN_IDS`

Example configuration:

```env
ALLOWED_CHAIN_IDS=1,137
RPC_URL_1=https://eth-mainnet.g.alchemy.com/v2/your-api-key
RPC_URL_137=https://polygon-mainnet.g.alchemy.com/v2/your-api-key
```

Note: The first chain ID in `ALLOWED_CHAIN_IDS` will be used as the default chain for the `/[channelId]` route.

## Routes

- `GET /chain/[chainId]/[channelId]` - Resolves channel metadata for a specific chain and channel
- `GET /[channelId]` - Resolves channel metadata using the default chain (first chain in `ALLOWED_CHAIN_IDS`)

## Development

First, run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
