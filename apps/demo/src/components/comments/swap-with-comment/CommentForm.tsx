import {
  CommentForm as BaseCommentForm,
  CommentFormProps,
} from "../core/CommentForm";
import { useState } from "react";
import { useAccount, useChainId } from "wagmi";
import { PriceView, type PriceViewState } from "./0x/PriceView";
import { QuoteView, type QuoteViewState } from "./0x/QuoteView";
import { SwapWithCommentExtra } from "./hooks/useCommentActions";

export function CommentForm({ disabled, ...props }: CommentFormProps) {
  const [finalizedPriceState, setFinalize] = useState<PriceViewState | null>(
    null,
  );
  const [quoteViewState, setQuote] = useState<QuoteViewState | null>(null);
  const { address } = useAccount();
  const chainId = useChainId();

  return (
    <>
      {finalizedPriceState ? (
        <QuoteView
          taker={address}
          priceViewState={finalizedPriceState}
          onQuote={setQuote}
          chainId={chainId}
        />
      ) : (
        <PriceView taker={address} onFinalize={setFinalize} chainId={chainId} />
      )}
      <BaseCommentForm<SwapWithCommentExtra>
        {...props}
        disabled={!finalizedPriceState || !quoteViewState || disabled}
        submitIdleLabel="Swap"
        submitPendingLabel="Posting..."
        extra={quoteViewState ? { quoteViewState: quoteViewState } : undefined}
        onSubmitSuccess={() => {
          setQuote(null);
          setFinalize(null);

          props.onSubmitSuccess?.();
        }}
      />
    </>
  );
}
