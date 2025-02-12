# Embed Demo Blog

This is an example of how to embed the Comments service into a blog.

[See it in action](https://demo-blog.ethcomments.xyz/)

## Installation

```bash
pnpm install
```

## Development

1. Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

2. Configure environment variables in `.env.local`:

- `NEXT_PUBLIC_ECP_ETH_EMBED_URL` (Optional): URL to ecp.eth embed renderer. Defaults to locally hosted embed server.
- `NEXT_PUBLIC_URL`: URL of the embed demo blog deployment, used to construct target URI for embedded comments.

3. Start the development server:

```bash
pnpm dev
```

The application will be available at [http://localhost:3003](http://localhost:3003).

## Building for Production

```bash
pnpm build
```

## Starting Production Server

```bash
pnpm start
```
