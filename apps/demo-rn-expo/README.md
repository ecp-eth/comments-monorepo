# Ethereum Comments Protocol Expo Demo App

This is React Native (Expo) demo app for the [Ethereum Comments Protocol](https://docs.ethcomments.xyz).

It is very similar to the [react demo app](https://github.com/ecp-eth/comments-monorepo/tree/main/apps/demo), but built with a React Native tech stack.

- Custom commenting UI
- Wallet integration via Reown AppKit
- Post and reply contract interactions via Reown AppKit
- Infinite scroll using `FlatList`

## Running the app

You may want to test the app on your phone because it requires wallet app to post comments:

1. Install dependencies:

```bash
pnpm install
```

2. Create a `.env` file based on the `.env.sample` file:

```bash
cp .env.example .env
```

3. Update the `.env` file with your own values.

4. Run the app:

```bash
pnpm start
```

5. Scan the QR code from the terminal with the [Expo Go](https://expo.dev/go) app on your phone.
