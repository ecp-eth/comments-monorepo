import { z } from "zod/v3";

// Error response schemas
export const BadRequestResponseBodySchema = z.record(
  z.string(),
  z.string().array(),
);

export const ErrorResponseBodySchema = z.object({
  error: z.string(),
});
