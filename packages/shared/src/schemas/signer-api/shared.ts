import { HexSchema } from "@ecp.eth/sdk/core";
import { z } from "zod/v3";

// Error response schemas
export const BadRequestResponseBodySchema = z.record(
  z.string(),
  z.string().array(),
);

export const ErrorResponseBodySchema = z.object({
  error: z.string(),
});

export const AuthorSignatureSchema = HexSchema.describe(
  "Signature of the author, required if the user has not approved our submitter address. If not provided, a SIWE auth token must be provided in the headers.",
).optional();
