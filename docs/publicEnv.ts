/// <reference types="vite/client" />

import { z } from "zod";

export const publicEnvSchema = z.object({
  VITE_ECP_ETH_EMBED_URL: z.coerce
    .string()
    // had to do transform because empty env var in vite is considered as
    // empty string, like below:
    //
    // ```
    // VITE_ECP_ETH_EMBED_URL=
    // ```
    .transform((val) =>
      z.string().url().safeParse(val).success ? val : undefined,
    )
    .optional(),
  VITE_ECP_ETH_EMBED_BY_AUTHOR_URL: z.coerce
    .string()
    .url()
    .transform((val) =>
      z.string().url().safeParse(val).success ? val : undefined,
    )
    .optional(),
  VITE_ECP_ETH_EMBED_BY_REPLIES_URL: z.coerce
    .string()
    .url()
    .transform((val) =>
      z.string().url().safeParse(val).success ? val : undefined,
    )
    .optional(),
});

export const publicEnv = publicEnvSchema.parse({
  VITE_ECP_ETH_EMBED_URL: import.meta.env.VITE_ECP_ETH_EMBED_URL,
  VITE_ECP_ETH_EMBED_BY_AUTHOR_URL: import.meta.env
    .VITE_ECP_ETH_EMBED_BY_AUTHOR_URL,
  VITE_ECP_ETH_EMBED_BY_REPLIES_URL: import.meta.env
    .VITE_ECP_ETH_EMBED_BY_REPLIES_URL,
});
