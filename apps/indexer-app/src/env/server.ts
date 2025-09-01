import { z } from "zod";

const serverEnvSchema = z.object({});

const result = serverEnvSchema.safeParse(process.env);

if (!result.success) {
  throw new Error(
    "Invalid server environment variables: \n\n" +
      JSON.stringify(result.error.format(), null, 2),
  );
}

export const serverEnv = result.data;
