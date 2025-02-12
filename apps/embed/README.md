# Comments Embed

Comments Embed is a service that provides embeddable comments functionality for any web page.

## Usage

The service provides a single endpoint:

```
https://localhost:3002?targetUri={url}
```

where `targetUri` is a URL-encoded address of the page for which you want to display comments.

Example:

```
https://localhost:3002?targetUri=https%3A%2F%2Fexample.com%2Fpost%2F1
```

## Installation

1. Clone the repository
2. Install dependencies:

```bash
pnpm install
```

## Development

To run the development server:

```bash
pnpm dev
```

This will start the server at [http://localhost:3002](http://localhost:3002).

### Environment Variables

Copy `.env.example` to `.env` and configure the following required environment variables:

| Variable                    | Description                                                        |
| --------------------------- | ------------------------------------------------------------------ |
| `APP_SIGNER_PRIVATE_KEY`    | App identity signer private key (generate using `cast wallet new`) |
| `NEXT_PUBLIC_WC_PROJECT_ID` | WalletConnect project ID (obtain from https://cloud.reown.com)     |
| `COMMENTS_INDEXER_URL`      | The URL of the comments indexer (default: http://localhost:42069)  |

### Build

To create a production build:

```bash
pnpm build
```

To start the production server:

```bash
pnpm start
```
