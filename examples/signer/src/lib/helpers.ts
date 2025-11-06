import { PrivyClient } from "@privy-io/server-auth";
import { createViemAccount } from "@privy-io/server-auth/viem";
import { privateKeyToAccount } from "viem/accounts";
import { env } from "./env";
import type { Hex } from "@ecp.eth/sdk/core";
import type { z } from "zod";
import { SUPPORTED_CHAINS, type SupportedChainConfig } from "@ecp.eth/sdk";
import { nonceManager } from "@/instances";

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
    return privateKeyToAccount(configuration.signerPrivateKey, {
      nonceManager,
    });
  }

  return createPrivyAccount(configuration);
}

export async function getGaslessSubmitter() {
  const configuration = getGaslessConfiguration();

  if (configuration.type === "eth") {
    return privateKeyToAccount(configuration.submitterPrivateKey, {
      nonceManager,
    });
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

type GetRawShapeOfZodObject<T> =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends z.ZodObject<infer S, any, any, any, any> ? S : never;

export function augmentZodSchemaWithAllowedChainIdAndChainConfig<
  KeyType extends string | undefined,
  ChainIdContainerType extends
    | z.ZodObject<{
        chainId: z.ZodNumber;
      }>
    | z.ZodUnion<
        [
          z.ZodObject<{ chainId: z.ZodNumber }>,
          z.ZodObject<{ chainId: z.ZodNumber }>,
        ]
      >,
  ContaineredSchema extends z.ZodObject<{
    [k in Exclude<KeyType, undefined>]: ChainIdContainerType;
  }>,
  OutputZodObject extends z.ZodTypeAny = z.ZodObject<
    GetRawShapeOfZodObject<ChainIdContainerType>,
    "strip",
    z.ZodTypeAny,
    z.output<ChainIdContainerType> & { chainConfig: SupportedChainConfig },
    z.input<ChainIdContainerType>
  >,
  UpdatedChainIdContainerType extends
    | OutputZodObject
    | z.ZodUnion<
        readonly [OutputZodObject, OutputZodObject]
      > = ChainIdContainerType extends z.ZodObject<{
    chainId: z.ZodNumber;
  }>
    ? OutputZodObject
    : z.ZodUnion<readonly [OutputZodObject, OutputZodObject]>,
  RetType = KeyType extends undefined
    ? z.ZodEffects<UpdatedChainIdContainerType>
    : z.ZodEffects<
        z.ZodObject<
          GetRawShapeOfZodObject<ContaineredSchema> & {
            [k in Exclude<KeyType, undefined>]: UpdatedChainIdContainerType;
          }
        >
      >,
>(
  schema: KeyType extends undefined ? ChainIdContainerType : ContaineredSchema,
  key: KeyType,
): RetType {
  const ret = schema.transform((val) => {
    const chainIdContainer = (
      key !== undefined ? val[key as keyof typeof val] : val
    ) as { chainId: number };
    const isAllowedChainId = env.ENABLED_CHAINS.includes(
      chainIdContainer.chainId as keyof typeof SUPPORTED_CHAINS,
    );

    if (!isAllowedChainId) {
      throw new Error("Invalid chain ID");
    }

    const chainConfigContainer = {
      ...chainIdContainer,
      chainConfig:
        SUPPORTED_CHAINS[
          chainIdContainer.chainId as keyof typeof SUPPORTED_CHAINS
        ],
    };

    return {
      ...val,
      ...(key === undefined
        ? chainConfigContainer
        : {
            [key]: {
              ...chainConfigContainer,
            },
          }),
    };
  });

  return ret as unknown as RetType;
}

export function never(message: string = "Unreachable code"): never {
  throw new Error(message);
}

export function getPEMPublicKey(publicKey: string) {
  if (publicKey.startsWith("-----BEGIN PUBLIC KEY-----")) {
    return publicKey;
  }

  return `-----BEGIN PUBLIC KEY-----\n${publicKey.replace(/(.{64})/g, "$1\n")}\n-----END PUBLIC KEY-----`;
}
