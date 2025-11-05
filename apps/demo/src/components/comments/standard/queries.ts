import { z } from "zod";
import {
  SignPostCommentRequestPayloadSchema,
  SignPostCommentResponseBodySchema,
} from "@ecp.eth/shared/schemas/signer-api/post";
import {
  SignEditCommentRequestPayloadSchema,
  SignEditCommentResponseBodySchema,
} from "@ecp.eth/shared/schemas/signer-api/edit";
import { publicEnv } from "@/publicEnv";
import {
  fetchAuthorData,
  type IndexerAPICommentReferencesSchemaType,
  type IndexerAPICommentZeroExSwapSchemaType,
} from "@ecp.eth/sdk/indexer";
import { type Chain, ContractFunctionExecutionError, type Hex } from "viem";
import {
  InvalidCommentError,
  throwKnownResponseCodeError,
} from "@ecp.eth/shared/errors";
import { chain } from "@/lib/clientWagmi";
import type {
  CommentDataWithIdSchemaType,
  PendingEditCommentOperationSchemaType,
  PendingPostCommentOperationSchemaType,
  SignEditCommentResponseClientSchemaType,
} from "@ecp.eth/shared/schemas";
import { formatContractFunctionExecutionError } from "@ecp.eth/shared/helpers";
import { getSignerURL } from "@/lib/utils";
import { DistributiveOmit } from "@ecp.eth/shared/types";

export class SubmitCommentMutationError extends Error {}
export class SubmitEditCommentMutationError extends Error {}

type SubmitCommentParams = {
  requestPayload: DistributiveOmit<
    z.input<typeof SignPostCommentRequestPayloadSchema>,
    "chainId"
  >;
  zeroExSwap: IndexerAPICommentZeroExSwapSchemaType | null;
  switchChainAsync: (chainId: number) => Promise<Chain>;
  writeContractAsync: (params: {
    signCommentResponse: {
      signature: Hex;
      data: CommentDataWithIdSchemaType;
    };
    chainId: number;
  }) => Promise<Hex>;
  references: IndexerAPICommentReferencesSchemaType;
};

export async function submitCommentMutationFunction({
  requestPayload,
  switchChainAsync,
  writeContractAsync,
  zeroExSwap,
  references,
}: SubmitCommentParams): Promise<PendingPostCommentOperationSchemaType> {
  const parseResult = SignPostCommentRequestPayloadSchema.safeParse({
    ...requestPayload,
  });

  if (!parseResult.success) {
    throw new InvalidCommentError(parseResult.error.flatten().fieldErrors);
  }

  const { author } = parseResult.data;

  // ignore errors here, we don't want to block the comment submission
  const resolvedAuthor = await fetchAuthorData({
    address: author,
    apiUrl: publicEnv.NEXT_PUBLIC_COMMENTS_INDEXER_URL,
  }).catch((e) => {
    console.error(e);
    return undefined;
  });

  const switchedChain = await switchChainAsync(chain.id);

  if (switchedChain.id !== chain.id) {
    throw new SubmitCommentMutationError("Failed to switch chain.");
  }

  const response = await fetch(getSignerURL("/api/post-comment/sign"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...parseResult.data,
      chainId: chain.id,
    } satisfies z.input<typeof SignPostCommentRequestPayloadSchema>),
  });

  if (!response.ok) {
    await throwKnownResponseCodeError(response);

    throw new SubmitCommentMutationError(
      "Failed to obtain signed comment data, please try again.",
    );
  }

  const signedCommentResult = SignPostCommentResponseBodySchema.safeParse(
    await response.json(),
  );

  if (!signedCommentResult.success) {
    throw new SubmitCommentMutationError(
      "Server returned malformed signed comment data, please try again.",
    );
  }

  try {
    const txHash = await writeContractAsync({
      signCommentResponse: signedCommentResult.data,
      chainId: chain.id,
    });

    return {
      txHash,
      resolvedAuthor,
      response: signedCommentResult.data,
      type: "non-gasless",
      action: "post",
      state: { status: "pending" },
      chainId: chain.id,
      zeroExSwap: zeroExSwap ?? undefined,
      references,
    };
  } catch (e) {
    if (e instanceof ContractFunctionExecutionError) {
      const simplifiedErrorMessage = formatContractFunctionExecutionError(e);

      if (simplifiedErrorMessage) {
        throw new SubmitCommentMutationError(simplifiedErrorMessage);
      }

      throw new SubmitCommentMutationError(e.details);
    }

    console.error(e);

    throw new SubmitCommentMutationError(
      "Failed to post comment, please try again.",
    );
  }
}

type SubmitEditCommentParams = {
  requestPayload: DistributiveOmit<
    z.input<typeof SignEditCommentRequestPayloadSchema>,
    "chainId"
  >;
  switchChainAsync: (chainId: number) => Promise<Chain>;
  writeContractAsync: (params: {
    signEditCommentResponse: SignEditCommentResponseClientSchemaType;
    chainId: number;
  }) => Promise<Hex>;
};

export async function submitEditCommentMutationFunction({
  requestPayload,
  switchChainAsync,
  writeContractAsync,
}: SubmitEditCommentParams): Promise<
  Omit<PendingEditCommentOperationSchemaType, "references">
> {
  const parseResult =
    SignEditCommentRequestPayloadSchema.safeParse(requestPayload);

  if (!parseResult.success) {
    throw new InvalidCommentError(parseResult.error.flatten().fieldErrors);
  }

  const switchedChain = await switchChainAsync(chain.id);

  if (switchedChain.id !== chain.id) {
    throw new SubmitEditCommentMutationError("Failed to switch chain.");
  }

  const response = await fetch(getSignerURL("/api/edit-comment/sign"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...parseResult.data,
      chainId: chain.id,
    } satisfies z.input<typeof SignEditCommentRequestPayloadSchema>),
  });

  if (!response.ok) {
    await throwKnownResponseCodeError(response);

    throw new SubmitEditCommentMutationError(
      "Failed to obtain signed comment data, please try again.",
    );
  }

  const signedCommentResult = SignEditCommentResponseBodySchema.safeParse(
    await response.json(),
  );

  if (!signedCommentResult.success) {
    throw new SubmitEditCommentMutationError(
      "Server returned malformed signed comment data, please try again.",
    );
  }

  try {
    const txHash = await writeContractAsync({
      signEditCommentResponse: signedCommentResult.data,
      chainId: chain.id,
    });

    return {
      txHash,
      response: signedCommentResult.data,
      type: "non-gasless",
      action: "edit",
      state: { status: "pending" },
      chainId: chain.id,
    };
  } catch (e) {
    if (e instanceof ContractFunctionExecutionError) {
      if (e.shortMessage.includes("User rejected the request.")) {
        throw new SubmitEditCommentMutationError(
          "Could not edit the comment because the transaction was rejected.",
        );
      }

      throw new SubmitEditCommentMutationError(e.details);
    }

    console.error(e);

    throw new SubmitEditCommentMutationError(
      "Failed to edit comment, please try again.",
    );
  }
}
