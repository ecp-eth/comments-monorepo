import type { Hex } from "viem";
import {
  CommentForm as BaseCommentForm,
  type OnSubmitFunction,
} from "../CommentForm";
import { submitCommentMutationFunction } from "../queries";
import { useCallback, useState } from "react";
import { chain } from "@/lib/wagmi";
import {
  useAccount,
  useChainId,
  useSwitchChain,
  useWriteContract,
} from "wagmi";
import { postCommentAsAuthorViaCommentsV1 } from "@/lib/contract";
import { Button } from "@/components/ui/button";
import type { OnSubmitSuccessFunction } from "@ecp.eth/shared/types";
import { PriceView } from "./0x/PriceView";
import QuoteView from "./0x/QuoteView";
import type {
  PriceResponseLiquidityAvailableSchemaType,
  QuoteResponseLiquidityAvailableSchemaType,
} from "./0x/schemas";

type CommentFormProps = {
  parentId?: Hex;
  onSubmitSuccess: OnSubmitSuccessFunction;
};

export function CommentForm({ parentId, onSubmitSuccess }: CommentFormProps) {
  const [finalizedPrice, setFinalize] =
    useState<PriceResponseLiquidityAvailableSchemaType | null>(null);
  const [quote, setQuote] =
    useState<QuoteResponseLiquidityAvailableSchemaType | null>(null);
  const { address } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();

  const handleSubmitComment = useCallback<OnSubmitFunction<"post">>(
    async ({ address, content }) => {
      const result = await submitCommentMutationFunction({
        address,
        commentRequest: {
          chainId: chain.id,
          content,
          targetUri: window.location.href,
          parentId,
        },
        switchChainAsync(chainId) {
          return switchChainAsync({ chainId });
        },
        writeContractAsync(params) {
          return postCommentAsAuthorViaCommentsV1(
            {
              appSignature: params.signature,
              commentData: params.data,
            },
            writeContractAsync
          );
        },
      });

      return result;
    },
    [parentId, switchChainAsync, writeContractAsync]
  );

  return (
    <>
      {finalizedPrice ? (
        <QuoteView
          taker={address}
          price={finalizedPrice}
          setQuote={setQuote}
          chainId={chainId}
        />
      ) : (
        <PriceView
          taker={address}
          setFinalize={setFinalize}
          chainId={chainId}
        />
      )}
      <BaseCommentForm
        onSubmit={handleSubmitComment}
        onSubmitSuccess={onSubmitSuccess}
        renderSubmitButton={({ isSubmitting, isContentValid, formState }) => (
          <>
            <Button
              name="action"
              value="post"
              type="submit"
              className="px-4 py-2 rounded"
              disabled={isSubmitting || !isContentValid}
            >
              {formState === "post" ? "Posting..." : "Swap with comment"}
            </Button>
          </>
        )}
      />
    </>
  );
}
