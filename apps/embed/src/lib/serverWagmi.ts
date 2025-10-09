import { http } from "wagmi";
import { env } from "@/env";
import { publicEnv } from "@/publicEnv";

export const privateTransport =
  publicEnv.NODE_ENV === "development"
    ? http("http://localhost:8545")
    : http(env.PRIVATE_RPC_URL);
