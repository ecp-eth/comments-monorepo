import { PrivyClient } from "@privy-io/server-auth";
import { createViemAccount } from "@privy-io/server-auth/viem";
import { privateKeyToAccount } from "viem/accounts";
import { env } from "./env";
import type { Hex } from "@ecp.eth/sdk/core";

export class GaslessNotAvailableError extends Error {
  constructor() {
    super("Gasless is not available");
  }
}

type PrivyConfiguration = {
  type: "privy";
  appId: string;
  secret: string;
  authorizationKey: string;
  walletAddress: Hex;
  walletId: string;
  signerPrivateKey?: Hex;
};

type EthConfiguration = {
  type: "eth";
  signerPrivateKey: Hex;
  submitterPrivateKey: Hex;
};

export function getGaslessConfiguration():
  | PrivyConfiguration
  | EthConfiguration {
  switch (env.GASLESS_METHOD) {
    case "private-key":
      return {
        type: "eth",
        signerPrivateKey:
          env.GASLESS_APP_SIGNER_PRIVATE_KEY ||
          env.GASLESS_SUBMITTER_PRIVATE_KEY,
        submitterPrivateKey: env.GASLESS_SUBMITTER_PRIVATE_KEY,
      };
    case "privy":
      return {
        type: "privy",
        appId: env.GASLESS_PRIVY_APP_ID,
        secret: env.GASLESS_PRIVY_SECRET,
        authorizationKey: env.GASLESS_PRIVY_AUTHORIZATION_KEY,
        walletAddress: env.GASLESS_PRIVY_WALLET_ADDRESS,
        walletId: env.GASLESS_PRIVY_WALLET_ID,
        signerPrivateKey: env.GASLESS_PRIVY_APP_SIGNER_PRIVATE_KEY,
      };
    default:
      throw new GaslessNotAvailableError();
  }
}

export async function getGaslessSigner() {
  const configuration = getGaslessConfiguration();

  if (configuration.type === "eth" && configuration.signerPrivateKey) {
    return privateKeyToAccount(configuration.signerPrivateKey);
  }

  return createPrivyAccount(configuration);
}

export async function getGaslessSubmitter() {
  const configuration = getGaslessConfiguration();

  if (configuration.type === "eth") {
    return privateKeyToAccount(configuration.submitterPrivateKey);
  }

  return createPrivyAccount(configuration);
}

export async function createPrivyAccount(configuration: PrivyConfiguration) {
  const privy = new PrivyClient(configuration.appId, configuration.secret, {
    walletApi: {
      authorizationPrivateKey: configuration.authorizationKey,
    },
  });

  return createViemAccount({
    address: configuration.walletAddress,
    privy,
    walletId: configuration.walletId,
  });
}
