import { HexSchema } from "@ecp.eth/sdk/core";
import { z } from "zod";

export const refreshAccessTokenResponseSchema = z.object({
  accessToken: z.object({
    token: z.string(),
    expiresIn: z.number(),
  }),
  refreshToken: z.object({
    token: z.string(),
    expiresIn: z.number(),
  }),
});

export type RefreshAccessTokenResponse = z.infer<
  typeof refreshAccessTokenResponseSchema
>;

export const siweVerifyResponseSchema = z.object({
  address: HexSchema,
  accessToken: z.object({
    token: z.string(),
    expiresIn: z.number(),
  }),
  refreshToken: z.object({
    token: z.string(),
    expiresIn: z.number(),
  }),
});
