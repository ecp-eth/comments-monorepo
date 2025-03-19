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
import type { PriceResponse } from "./0x/types";
import QuoteView from "./0x/QuoteView";

type CommentFormProps = {
  parentId?: Hex;
  onSubmitSuccess: OnSubmitSuccessFunction;
};

export function CommentForm({ parentId, onSubmitSuccess }: CommentFormProps) {
  const [finalize, setFinalize] = useState(false);
  const [price, setPrice] = useState<PriceResponse | undefined>();
  const [quote, setQuote] = useState();
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
      {finalize && price ? (
        <QuoteView
          taker={address}
          price={price}
          quote={quote}
          setQuote={setQuote}
          chainId={chainId}
        />
      ) : (
        <PriceView
          taker={address}
          price={price}
          setPrice={setPrice}
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
