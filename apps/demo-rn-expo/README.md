# Ethereum Comments Protocol Expo Demo App

This is React Native (Expo) demo app for the [Ethereum Comments Protocol](https://docs.ethcomments.xyz).

It is very similar to the [react demo app](https://github.com/ecp-eth/comments-monorepo/tree/main/apps/demo), but built with a React Native tech stack.

- Custom commenting UI
- Wallet integration via Reown AppKit
- Post and reply contract interactions via Reown AppKit
- Infinite scroll using `FlatList`

## Running the app

### Prerequisites

1. Start your local Anvil chain and deploy the protocols to your local chain. Folllow [the instruction here](https://docs.ethcomments.xyz/test-with-anvil).
2. Configure your wallet app in your phone to use the local chain. In MetaMask, you need to make sure the RPC URL of local chain is accessible from your phone in order to add the custom RPC network.
3. Follow the instruction in readme to start the [indexer](https://github.com/ecp-eth/comments-monorepo/tree/main/apps/indexer) and the [react demo app](https://github.com/ecp-eth/comments-monorepo/tree/main/apps/demo), as this demo uses the signing API from the react demo app.

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
# until expo 0.53 is fully release we need to run development built instead
# https://docs.expo.dev/develop/development-builds/create-a-build/
pnpm run dev:ios
```

5. Scan the QR code from the terminal with the [Expo Go](https://expo.dev/go) app on your phone.

# Known PNPM issues:

- although PNPM team consider that is correct behavior, we experienced a couple times when upgrading libs (totally unrelated to wagmi, such as react-native-async-storage) in this repo, causing a duplicated `wagmi` package gets referenced by `sdk` and `shared` packages, this cause build issues for the other apps in the monorepo. We've tried solution from [this issue](https://github.com/pnpm/pnpm/issues/5585) but none of them permanently fixed the issue, we should consider writing a custom script to force linking the packages into the same folder.
