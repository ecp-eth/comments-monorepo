import { publicEnv } from "@/env/public";
import { serverEnv } from "@/env/server";
import {
  ALLOWED_UPLOAD_MIME_TYPES,
  MAX_UPLOAD_FILE_SIZE,
} from "@ecp.eth/react-editor";
import {
  BadRequestResponseSchema,
  InternalServerErrorResponseSchema,
  GenerateUploadUrlResponseSchema,
} from "@/api/schemas";
import { JSONResponse } from "@ecp.eth/shared/helpers";
import { PinataSDK } from "pinata";
import z from "zod";

const pinata = new PinataSDK({
  pinataJwt: serverEnv.PINATA_JWT,
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
      maxFileSize: MAX_UPLOAD_FILE_SIZE,
    });

    return new JSONResponse(GenerateUploadUrlResponseSchema, {
      url,
    });
  } catch (e) {
    console.error(e);

    return new JSONResponse(
      InternalServerErrorResponseSchema,
      {
        error: "Failed to generate upload URL",
      },
      { status: 500 },
    );
  }
}
