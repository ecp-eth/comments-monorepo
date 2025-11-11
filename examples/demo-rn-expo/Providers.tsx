import React, { PropsWithChildren } from "react";
import { WagmiProvider } from "wagmi";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createAppKit, AppKitProvider } from "@reown/appkit-react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { safeJsonParse, safeJsonStringify } from "@walletconnect/safe-json";
import { type Storage } from "@reown/appkit-react-native";
import ErrorBoundary from "./ErrorBoundary";
import { chain, projectId, wagmiAdapter } from "./wagmi.config";

const queryClient = new QueryClient();

const storage: Storage = {
  getKeys: async () => {
    return (await AsyncStorage.getAllKeys()) as string[];
  },
  getEntries: async <T = unknown,>(): Promise<[string, T][]> => {
    const keys = await AsyncStorage.getAllKeys();
    return await Promise.all(
      keys.map(async (key) => [
        key,
        safeJsonParse((await AsyncStorage.getItem(key)) ?? "") as T,
      ]),
    );
  },
  setItem: async <T = unknown,>(key: string, value: T) => {
    await AsyncStorage.setItem(key, safeJsonStringify(value));
  },
  getItem: async <T = unknown,>(key: string): Promise<T | undefined> => {
    const item = await AsyncStorage.getItem(key);
    if (typeof item === "undefined" || item === null) {
      return undefined;
    }

    return safeJsonParse(item) as T;
  },
  removeItem: async (key: string) => {
    await AsyncStorage.removeItem(key);
  },
};

// export const transport = http(publicEnv.EXPO_PUBLIC_RPC_URL, {
//   fetchOptions: {
//     headers: {
//       // the RPC URL used by api might has restricted origin
//       Origin: publicEnv.EXPO_PUBLIC_SIGNER_API_URL,
//     },
//   },
// }

const appKit = createAppKit({
  projectId,
  featuredWalletIds: [
    // rainbow
    "1ae92b26df02f0abca6304df07debccd18262fdf5fe82daa81593582dac9a369",
    // Zerion
    "ecc4036f814562b41a5268adc86270fba1365471402006302e70169465b7ac18",
    // metamask
    "c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96",
    // rabby (useful for local testing as it supports custom RPC URLs)
    "18388be9ac2d02726dbac9777c96efaac06d744b2f6d580fccdd4127a6d01fd1",
  ],
  adapters: [wagmiAdapter],
  networks: [chain],
  storage,
  enableAnalytics: true,
  metadata: {
    name: "ECP.eth React Native Demo",
    description: "ECP.eth React Native Demo",
    url: "https://demo.ethcomments.xyz",
    icons: ["https://docs.ethcomments.xyz/logo-light.svg"],
    redirect: {
      native: "ECP_RN_DEMO://",
      universal: "rn.demo.ethcomments.xyz",
    },
  },
});

export default function Providers({ children }: PropsWithChildren) {
  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <AppKitProvider instance={appKit}>
          <WagmiProvider config={wagmiAdapter.wagmiConfig}>
            <QueryClientProvider client={queryClient}>
              <GestureHandlerRootView>{children}</GestureHandlerRootView>
              <Toast />
            </QueryClientProvider>
          </WagmiProvider>
        </AppKitProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
