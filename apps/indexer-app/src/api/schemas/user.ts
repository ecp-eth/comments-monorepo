import { z } from "zod";

export const UserResponseSchema = z.object({
  id: z.string().uuid(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  role: z.enum(["admin", "user"]),
  authMethods: z.array(
    z.object({
      id: z.string().uuid(),
      createdAt: z.coerce.date(),
      updatedAt: z.coerce.date(),
      identifier: z.string(),
      method: z.enum(["siwe"]),
    }),
  ),
});

export type UserResponseSchemaType = z.infer<typeof UserResponseSchema>;
