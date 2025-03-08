/// <reference types="vite/client" />

import { z } from "zod";

export const publicEnvSchema = z.object({
  VITE_ECP_ETH_EMBED_URL: z.string().url().optional(),
});

export const publicEnv = publicEnvSchema.parse({
  VITE_ECP_ETH_EMBED_URL: import.meta.env.VITE_ECP_ETH_EMBED_URL,
});
