import z from "zod";
import {
  SignEditCommentPayloadRequestClientSchema,
  SignEditCommentResponseServerSchema,
} from "./schemas";
import {
  InvalidCommentError,
  throwKnownResponseCodeError,
} from "@ecp.eth/shared/errors";
import { SignCommentError } from "@/errors";

type SignEditCommentInput = z.input<
  typeof SignEditCommentPayloadRequestClientSchema
>;

export async function signEditComment(
  comment: SignEditCommentInput,
  {
    signal,
  }: {
    signal?: AbortSignal;
  } = {},
) {
  const commmentDataResult =
    SignEditCommentPayloadRequestClientSchema.safeParse(comment);

  if (!commmentDataResult.success) {
    throw new InvalidCommentError(
      commmentDataResult.error.flatten().fieldErrors,
    );
  }

  const signCommentResponse = await fetch("/api/sign-edit-comment", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(commmentDataResult.data),
    signal,
  });

  if (!signCommentResponse.ok) {
    await throwKnownResponseCodeError(signCommentResponse);

    throw new SignCommentError(
      "Failed to obtain signed comment data, please try again.",
    );
  }

  const signCommentResult = SignEditCommentResponseServerSchema.safeParse(
    await signCommentResponse.json(),
  );

  if (!signCommentResult.success) {
    throw new SignCommentError(
      "Server returned malformed signed comment data, please try again.",
    );
  }

  return signCommentResult.data;
}
