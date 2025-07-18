import { z } from "@hono/zod-openapi";

export const BadRequestResponse = z.object({
  error: z.string(),
});

export const InternalServerErrorResponse = z.object({
  error: z.string(),
});

export const NotFoundResponse = z.object({
  error: z.string(),
});

export const UnsupportedMediaTypeResponse = z.object({
  error: z.string(),
});
