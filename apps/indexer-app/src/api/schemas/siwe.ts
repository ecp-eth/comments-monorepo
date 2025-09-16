import { HexSchema } from "@ecp.eth/sdk/core/schemas";
import { z } from "zod";

export const siweNonceResponseSchema = z.object({
  nonce: z.string().nonempty(),
  token: z.string().nonempty(),
});

export type SiweNonceResponse = z.infer<typeof siweNonceResponseSchema>;

export const RefreshAccessTokenResponseSchema = z.object({
  accessToken: z.object({
    token: z.string(),
    expiresAt: z.number(),
  }),
  refreshToken: z.object({
    token: z.string(),
    expiresAt: z.number(),
  }),
});

export type RefreshAccessTokenResponse = z.infer<
  typeof RefreshAccessTokenResponseSchema
>;

export const SiweVerifyRequestSchema = z.object({
  message: z.string().nonempty(),
  signature: HexSchema,
  token: z.string().nonempty(),
});

export type SiweVerifyRequest = z.infer<typeof SiweVerifyRequestSchema>;

export const SiweVerifyResponseSchema = z.object({
  accessToken: z.object({
    token: z.string(),
    expiresAt: z.number(),
  }),
  refreshToken: z.object({
    token: z.string(),
    expiresAt: z.number(),
  }),
});
