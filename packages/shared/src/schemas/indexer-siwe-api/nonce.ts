import z from "zod";

export const IndexerSIWENonceResponseBodySchema = z.object({
  nonce: z.string().nonempty(),
  token: z.string().nonempty(),
});
