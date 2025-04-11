import {
  CommentForm as BaseCommentForm,
  CommentFormProps,
} from "../core/CommentForm";
import { useCallback, useState } from "react";
import { useAccount, useChainId } from "wagmi";
import { PriceView } from "./0x/PriceView";
import QuoteView from "./0x/QuoteView";
import type {
  PriceResponseLiquidityAvailableSchemaType,
  QuoteResponseLiquidityAvailableSchemaType,
} from "./0x/schemas";
import { SwapWithCommentExtra } from "./hooks/useCommentActions";

export function CommentForm({ disabled, ...props }: CommentFormProps) {
  const [finalizedPrice, setFinalize] =
    useState<PriceResponseLiquidityAvailableSchemaType | null>(null);
  const [quote, setQuote] =
    useState<QuoteResponseLiquidityAvailableSchemaType | null>(null);
  const { address } = useAccount();
  const chainId = useChainId();

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
      <BaseCommentForm<SwapWithCommentExtra>
        {...props}
        disabled={!finalizedPrice || !quote || disabled}
        submitIdleLabel="Swap"
        submitPendingLabel="Posting..."
        extra={quote ? { quote } : undefined}
      />
    </>
  );
}
