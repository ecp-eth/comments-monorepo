import z from "zod";
import {
  SignCommentPayloadRequestClientSchema,
  SignCommentResponseServerSchema,
} from "./schemas";
import {
  InvalidCommentError,
  throwKnownResponseCodeError,
} from "@ecp.eth/shared/errors";
import { SignCommentError } from "@/errors";

type SignCommentOrReactionInput = z.input<
  typeof SignCommentPayloadRequestClientSchema
>;

export async function signCommentOrReaction(
  comment: SignCommentOrReactionInput,
  {
    signal,
  }: {
    signal?: AbortSignal;
  } = {},
) {
  const commentOrReaction =
    SignCommentPayloadRequestClientSchema.safeParse(comment);

  if (!commentOrReaction.success) {
    throw new InvalidCommentError(
      commentOrReaction.error.flatten().fieldErrors,
    );
  }

  const signCommentResponse = await fetch("/api/sign-comment", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(commentOrReaction.data),
    signal,
  });

  if (!signCommentResponse.ok) {
    await throwKnownResponseCodeError(signCommentResponse);

    throw new SignCommentError(
      "Failed to obtain signed comment data, please try again.",
    );
  }

  const signCommentResult = SignCommentResponseServerSchema.safeParse(
    await signCommentResponse.json(),
  );

  if (!signCommentResult.success) {
    throw new SignCommentError(
      "Server returned malformed signed comment data, please try again.",
    );
  }

  return signCommentResult.data;
}
