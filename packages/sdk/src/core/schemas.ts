import { z } from "zod/v3";

export const HexSchema = (
  z
    .string()
    .superRefine<`0x${string}`>((value, ctx): value is `0x${string}` => {
      if (!/^0x[0-9a-fA-F]+$/.test(value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Invalid hex format",
        });
      }
      return true;
      // the forced casting is to be backward compatible with the old implementation:
      // .custom<`0x${string}`>(
      //   (value) =>
      //     z
      //       .string()
      //       .regex(/^0x[0-9a-fA-F]+$/)
      //       .safeParse(value).success,
      // )
      // for the previous implementation it had stricter type checking, the input type was `0x${string}`
      // the new implementation allows us to record the base type string in zod inner type system
      // this make it useful for rendering the schema in a human readable way
    }) as z.ZodEffects<z.ZodString, `0x${string}`, `0x${string}`>
).describe("Hex format string, e.g. `0x1234567890abcdef`");

/**
 * type for hex format string, e.g. `0x1234567890abcdef`
 */
export type Hex = z.infer<typeof HexSchema>;
