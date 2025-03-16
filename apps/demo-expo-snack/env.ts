import { z } from "zod";

export const publicEnvSchema = z.object({
  EXPO_PUBLIC_REOWN_APP_ID: z.string().min(1),
  EXPO_PUBLIC_API_URL: z.string().url(),
  EXPO_PUBLIC_TARGET_URI: z.string().url(),
});

export const publicEnv = publicEnvSchema.parse({
  EXPO_PUBLIC_REOWN_APP_ID: process.env.EXPO_PUBLIC_REOWN_APP_ID,
  EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
  EXPO_PUBLIC_TARGET_URI: process.env.EXPO_PUBLIC_TARGET_URI,
});
