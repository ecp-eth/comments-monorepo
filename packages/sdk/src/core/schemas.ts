import { z } from "zod";

export const HexSchema = z.custom<`0x${string}`>(
  (value) =>
    z
      .string()
      .regex(/^0x[0-9a-fA-F]+$/)
      .safeParse(value).success,
);

/**
 * type for hex format string, e.g. `0x1234567890abcdef`
 */
export type Hex = z.infer<typeof HexSchema>;
