import { env } from "@/env";
import { ALLOWED_UPLOAD_MIME_TYPES } from "@/lib/constants";
import {
  BadRequestResponseSchema,
  InternalServerErrorResponseSchema,
  GenerateUploadUrlResponseSchema,
} from "@/lib/schemas";
import { publicEnv } from "@/publicEnv";
import { JSONResponse } from "@ecp.eth/shared/helpers";
import { PinataSDK } from "pinata";
import z from "zod";

const pinata = new PinataSDK({
  pinataJwt: env.PINATA_JWT,
  pinataGateway: publicEnv.NEXT_PUBLIC_PINATA_GATEWAY_URL,
});

const payloadSchema = z.object({
  filename: z.string().trim().nonempty(),
});

export async function POST(request: Request) {
  try {
    const parsedBodyResult = payloadSchema.safeParse(await request.json());

    if (!parsedBodyResult.success) {
      return new JSONResponse(
        BadRequestResponseSchema,
        parsedBodyResult.error.flatten().fieldErrors,
        { status: 400 },
      );
    }

    const url = await pinata.upload.public.createSignedURL({
      mimeTypes: ALLOWED_UPLOAD_MIME_TYPES,
      expires: 60,
      name: parsedBodyResult.data.filename,
    });

    return new JSONResponse(GenerateUploadUrlResponseSchema, {
      url,
    });
  } catch (e) {
    console.error(e);

    return new JSONResponse(InternalServerErrorResponseSchema, {
      error: "Failed to generate upload URL",
    });
  }
}
