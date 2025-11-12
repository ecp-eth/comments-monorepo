import z from "zod/v3";

export const IndexerSIWERefreshResponseBodySchema = z.object({
  accessToken: z.object({
    token: z.string(),
    expiresAt: z.number(),
  }),
  refreshToken: z.object({
    token: z.string(),
    expiresAt: z.number(),
  }),
});
