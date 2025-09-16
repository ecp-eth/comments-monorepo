import z from "zod";

export const GenerateUploadUrlResponseSchema = z.object({
  url: z.string().url(),
});

export const BadRequestResponseSchema = z.record(
  z.string(),
  z.string().array(),
);

export const InternalServerErrorResponseSchema = z.object({
  error: z.string(),
});
