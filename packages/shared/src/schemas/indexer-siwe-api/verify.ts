import z from "zod/v3";
import { HexSchema } from "@ecp.eth/sdk/core";

export const IndexerSIWEVerifyRequestPayloadSchema = z.object({
  message: z.string().nonempty(),
  signature: HexSchema,
  token: z.string().nonempty(),
});

export const IndexerSIWEVerifyResponseBodySchema = z.object({
  accessToken: z.object({
    token: z.string().nonempty(),
    expiresAt: z.number().int().positive(),
  }),
  refreshToken: z.object({
    token: z.string().nonempty(),
    expiresAt: z.number().int().positive(),
  }),
});
