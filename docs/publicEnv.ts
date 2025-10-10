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
  VITE_ECP_ENABLE_PREAPPROVED_GASLESS: z
    .enum(["1", "0"])
    .default("0")
    .transform((val) => val === "1"),
});

export const publicEnv = publicEnvSchema.parse({
  VITE_ECP_ETH_EMBED_URL: import.meta.env.VITE_ECP_ETH_EMBED_URL,
  VITE_ECP_ETH_EMBED_BY_AUTHOR_URL: import.meta.env
    .VITE_ECP_ETH_EMBED_BY_AUTHOR_URL,
  VITE_ECP_ETH_EMBED_BY_REPLIES_URL: import.meta.env
    .VITE_ECP_ETH_EMBED_BY_REPLIES_URL,
  VITE_ECP_ENABLE_PREAPPROVED_GASLESS: import.meta.env
    .VITE_ECP_ENABLE_PREAPPROVED_GASLESS,
});
