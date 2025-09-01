import { z } from "zod";

export const ListAppsResponseSchema = z.object({
  results: z.array(
    z.object({
      id: z.string().uuid(),
      createdAt: z.coerce.date(),
      updatedAt: z.coerce.date(),
      name: z.string(),
    }),
  ),
  pageInfo: z.object({
    totalPages: z.number().int().nonnegative(),
  }),
});
