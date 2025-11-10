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

### Build dependent libs in dev mode

Run below command before starting the server to build libs in dev mode. Libs in dev mode is configured with dev contract address for working with Anvil node locally.

```bash
pnpm dlx turbo build:dev
```

### Environment Variables

Copy `.env.example` to `.env` and configure the required environment variables.

### Build

To create a production build:

```bash
pnpm build
```

To start the production server:

```bash
pnpm start
```
