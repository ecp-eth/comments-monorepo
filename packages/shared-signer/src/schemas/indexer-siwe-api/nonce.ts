import z from "zod/v3";

export const IndexerSIWENonceResponseBodySchema = z.object({
  nonce: z.string().nonempty(),
  token: z.string().nonempty(),
});
