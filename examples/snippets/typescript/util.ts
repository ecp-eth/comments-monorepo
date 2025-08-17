import { Hex } from "@ecp.eth/sdk/core/schemas";
import dotenv from "dotenv";
import never from "never";
import { anvil, base } from "viem/chains";

dotenv.config({ path: [".env", ".env.local"] });

export function parseEnv() {
  return {
    get authorPrivateKey(): Hex {
      return (process.env.AUTHOR_PRIVATE_KEY ??
        never("AUTHOR_PRIVATE_KEY is not set")) as `0x${string}`;
    },
    get appPrivateKey(): Hex {
      return (process.env.APP_PRIVATE_KEY ??
        never("AUTHOR_PRIVATE_KEY is not set")) as `0x${string}`;
    },
    rpcUrl: process.env.RPC_URL ?? never("RPC URL is not set"),
    chain: process.env.CHAIN === "base" ? base : anvil,
    createChannelHookAddress: (process.env.CREATE_CHANNEL_HOOK_ADDRESS ??
      "0x0000000000000000000000000000000000000000") as Hex,
    get retrieveEstimatableHookFeeAuthor(): Hex {
      return process.env.RETRIEVE_ESTIMATABLE_HOOK_FEE_AUTHOR as Hex;
    },
    get retrieveEstimatableHookFeeChannelId(): bigint {
      return BigInt(
        process.env.RETRIEVE_ESTIMATABLE_HOOK_FEE_CHANNEL_ID ??
          never("RETRIEVE_ESTIMATABLE_HOOK_FEE_CHANNEL_ID is not set"),
      );
    },
  };
}
