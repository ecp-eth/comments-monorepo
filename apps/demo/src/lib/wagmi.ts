import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { createConfig, http } from "wagmi";
import { anvil, base } from "wagmi/chains";

export const chains =
  process.env.NODE_ENV === "development"
    ? ([anvil] as const)
    : ([base] as const);

export const transports = {
  [base.id]: http(process.env.NEXT_PUBLIC_BASE_RPC_URL),
  [anvil.id]: http("http://localhost:8545"),
} as const;

export const getConfig = () =>
  getDefaultConfig({
    chains,
    transports,
    appName: "Comment App",
    projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID!,
  });
