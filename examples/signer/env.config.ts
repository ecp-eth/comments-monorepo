import { z } from "zod";

const EnvSchemaForConfig = z.object({
  NODE_ENV: z.enum(["development", "production"]).default("development"),
  NEXT_PUBLIC_ACCESS_CONTROL_ALLOW_ORIGIN: z.string().default("*"),
});

export const envForConfig = EnvSchemaForConfig.parse(process.env);
