import { PrivyClient } from "@privy-io/server-auth";
import { createViemAccount } from "@privy-io/server-auth/viem";
import { env, SubmitterEnvSchema } from "@/env";
import { privateKeyToAccount } from "viem/accounts";

/**
 * Resolves either ETH submitter or Privy submitter account based on the environment variables.
 */
export async function resolveSubmitterAccount() {
  const submitterSettings = SubmitterEnvSchema.parse(env);

  if ("SUBMITTER_PRIVATE_KEY" in submitterSettings) {
    return privateKeyToAccount(submitterSettings.SUBMITTER_PRIVATE_KEY);
  }

  const privy = new PrivyClient(
    submitterSettings.PRIVY_APP_ID,
    submitterSettings.PRIVY_SECRET,
    {
      walletApi: {
        authorizationPrivateKey: submitterSettings.PRIVY_AUTHORIZATION_KEY,
      },
    },
  );

  return createViemAccount({
    address: submitterSettings.PRIVY_WALLET_ADDRESS,
    privy,
    walletId: submitterSettings.PRIVY_WALLET_ID,
  });
}
