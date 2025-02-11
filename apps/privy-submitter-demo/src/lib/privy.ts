import { PrivyClient } from "@privy-io/server-auth";
import { createViemAccount } from "@privy-io/server-auth/viem";

export const privy = new PrivyClient(
  process.env.PRIVY_APP_ID!,
  process.env.PRIVY_SECRET!,
  {
    walletApi: {
      authorizationPrivateKey: process.env.PRIVY_AUTHORIZATION_KEY!,
    },
  }
);

export const submitterAccount = createViemAccount({
  address: process.env.PRIVY_WALLET_ADDRESS! as `0x${string}`,
  privy,
  walletId: process.env.PRIVY_WALLET_ID!,
});
