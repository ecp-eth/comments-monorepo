import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "wagmi";
import { anvil, base } from "wagmi/chains";

export const chains =
  process.env.NODE_ENV === "development"
    ? ([anvil] as const)
    : ([base] as const);

export const transports = {
  [base.id]: http(process.env.PLASMO_PUBLIC_BASE_RPC_URL),
  [anvil.id]: http("http://localhost:8545"),
} as const;

export const config = getDefaultConfig({
  chains,
  transports,
  appName: "Comment Browser Extension",
  projectId: process.env.PLASMO_PUBLIC_WC_PROJECT_ID!,
});
