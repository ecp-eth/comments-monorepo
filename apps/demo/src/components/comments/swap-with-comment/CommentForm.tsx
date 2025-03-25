import { concat, numberToHex, size, type Hex } from "viem";
import {
  CommentForm as BaseCommentForm,
  type OnSubmitFunction,
} from "../CommentForm";
import { submitCommentMutationFunction } from "../queries";
import { useCallback, useState } from "react";
import {
  useAccount,
  useChainId,
  useSendTransaction,
  useSignTypedData,
  useSwitchChain,
  useWalletClient,
} from "wagmi";
import { Button } from "@/components/ui/button";
import type { OnSubmitSuccessFunction } from "@ecp.eth/shared/types";
import { PriceView } from "./0x/PriceView";
import { QuoteView } from "./0x/QuoteView";
import type {
  PriceResponseLiquidityAvailableSchemaType,
  QuoteResponseLiquidityAvailableSchemaType,
} from "./0x/schemas";
import { postCommentAsAuthorInBatch } from "@/lib/contract";

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
  const { signTypedDataAsync } = useSignTypedData();
  const { sendTransactionAsync } = useSendTransaction();
  const { data: walletClient } = useWalletClient();

  const handleSubmitComment = useCallback<OnSubmitFunction<"post">>(
    async ({ address, content }) => {
      if (!quote) {
        throw new Error("Quote is not finalized");
      }

      if (!walletClient) {
        throw new Error("Wallet is not connected");
      }

      // (1) Sign the Permit2 EIP-712 message returned from quote
      const signature = await signTypedDataAsync(quote.permit2.eip712);

      // (2) Append signature length and signature data to calldata
      const signatureLengthInHex = numberToHex(size(signature), {
        signed: false,
        size: 32,
      });

      const transactionData = quote.transaction.data;
      const sigLengthHex = signatureLengthInHex;
      const sig = signature;

      const result = await submitCommentMutationFunction({
        address,
        commentRequest: {
          content,
          targetUri: window.location.href,
          parentId,
        },
        switchChainAsync(chainId) {
          return switchChainAsync({ chainId });
        },
        writeContractAsync(signedComment) {
          quote.transaction.data = concat([transactionData, sigLengthHex, sig]);

          return postCommentAsAuthorInBatch({
            args: [
              [
                {
                  to: quote.transaction.to,
                  data: quote.transaction.data,
                  value: quote.transaction.value,
                },
              ],
            ],
            signedComment,
            walletClient,
          });
        },
      });

      setQuote(null);
      setFinalize(null);

      return result;
    },
    [
      chainId,
      parentId,
      quote,
      sendTransactionAsync,
      signTypedDataAsync,
      switchChainAsync,
    ]
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
        disabled={!finalizedPrice || !quote}
        onSubmit={handleSubmitComment}
        onSubmitSuccess={onSubmitSuccess}
        renderSubmitButton={({
          isSubmitting,
          isContentValid,
          formState,
          disabled,
        }) => (
          <>
            <Button
              name="action"
              value="post"
              type="submit"
              className="px-4 py-2 rounded"
              disabled={disabled || isSubmitting || !isContentValid}
            >
              {formState === "post" ? "Posting..." : "Swap"}
            </Button>
          </>
        )}
      />
    </>
  );
}
