import z from "zod";

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
