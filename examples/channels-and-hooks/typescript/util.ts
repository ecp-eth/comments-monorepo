import dotenv from "dotenv";
import never from "never";
import { anvil, base } from "viem/chains";

dotenv.config({ path: [".env", ".env.local"] });

export function parseEnv() {
  return {
    privateKey: (process.env.PRIVATE_KEY ??
      never("PRIVATE KEY is not set")) as `0x${string}`,
    rpcUrl: process.env.RPC_URL ?? never("RPC URL is not set"),
    chain: process.env.CHAIN === "base" ? base : anvil,
  };
}
