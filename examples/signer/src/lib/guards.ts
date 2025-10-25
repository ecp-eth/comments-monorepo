import { JSONResponse } from "@ecp.eth/shared/helpers";
import { Hex, VerifyTypedDataParameters, PublicActions, Address } from "viem";
import { env } from "./env";
import {
  BadRequestResponseBodySchema,
  ErrorResponseBodySchema,
} from "./schemas/shared";
import z, { ZodSchema } from "zod";
import { isMuted } from "@ecp.eth/sdk/indexer";
import { rateLimiter } from "@/instances";

export function guardAPIDeadline(deadline?: bigint) {
  if (deadline != null) {
    if (deadline < BigInt(Date.now()) / 1000n) {
      throw new JSONResponse(
        ErrorResponseBodySchema,
        { error: "Deadline is in the past" },
        { status: 400 },
      );
    }

    if (deadline > BigInt(Date.now() + 24 * 60 * 60 * 1000) / 1000n) {
      throw new JSONResponse(
        ErrorResponseBodySchema,
        { error: "Deadline is too far in the future" },
        { status: 400 },
      );
    }
  }
}

export async function guardAuthorSignature({
  publicClient,
  authorSignature,
  signTypedDataParams,
  authorAddress,
}: {
  // using type inferring here somehow cause excessive type inference errors, had to workaround it using any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  publicClient: PublicActions<any, any, any>;
  authorSignature?: Hex;
  signTypedDataParams: Omit<VerifyTypedDataParameters, "address" | "signature">;
  authorAddress: Address;
}) {
  if (!authorSignature) {
    throw new JSONResponse(
      ErrorResponseBodySchema,
      { error: "Author signature is required" },
      { status: 400 },
    );
  }

  const verified = await publicClient.verifyTypedData({
    ...signTypedDataParams,
    address: authorAddress,
    signature: authorSignature,
  });

  if (!verified) {
    throw new JSONResponse(
      ErrorResponseBodySchema,
      { error: "Invalid author signature" },
      { status: 400 },
    );
  }
}

export function guardAppSignerPrivateKey() {
  if (!env.APP_SIGNER_PRIVATE_KEY) {
    throw new JSONResponse(
      ErrorResponseBodySchema,
      { error: "App signer private key is not set" },
      { status: 500 },
    );
  }

  return env.APP_SIGNER_PRIVATE_KEY;
}

export function guardRequestPayloadSchemaIsValid<
  ZodSchemeType extends ZodSchema,
>(schema: ZodSchemeType, payload: unknown): z.output<ZodSchemeType> {
  const result = schema.safeParse(payload);

  if (!result.success) {
    throw new JSONResponse(
      BadRequestResponseBodySchema,
      result.error.flatten().fieldErrors as Record<string, string[]>,
      { status: 400 },
    );
  }

  return result.data;
}

export function guardContentLength(content: string) {
  if (content.length > env.COMMENT_CONTENT_LENGTH_LIMIT) {
    throw new JSONResponse(
      BadRequestResponseBodySchema,
      { content: ["Content length limit exceeded"] },
      { status: 400 },
    );
  }
}

export async function guardAuthorIsNotMuted(author: Address) {
  if (env.COMMENTS_INDEXER_URL) {
    if (await isMuted({ address: author, apiUrl: env.COMMENTS_INDEXER_URL })) {
      throw new JSONResponse(
        ErrorResponseBodySchema,
        { error: "Author is muted" },
        { status: 403 },
      );
    }
  }
}

export async function guardRateLimitNotExceeded(author: Address) {
  const rateLimitResult = await rateLimiter.isRateLimited(author);

  if (!rateLimitResult.success) {
    throw new JSONResponse(
      BadRequestResponseBodySchema,
      { author: ["Too many requests"] },
      {
        status: 429,
        headers: {
          "Retry-After": String(
            Math.ceil((rateLimitResult.reset - Date.now()) / 1000),
          ),
        },
      },
    );
  }
}
