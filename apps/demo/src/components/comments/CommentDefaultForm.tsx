import type { Hex } from "viem";
import { CommentForm, type OnSubmitFunction } from "./CommentForm";
import { submitCommentMutationFunction } from "./queries";
import { useCallback } from "react";
import { useSwitchChain, useWriteContract } from "wagmi";
import {
  postCommentAsAuthorViaCommentsV1,
  postCommentViaYoink,
} from "@/lib/contract";
import { Button } from "../ui/button";
import { publicEnv } from "@/publicEnv";
import type { OnSubmitSuccessFunction } from "@ecp.eth/shared/types";

type CommentDefaultFormProps = {
  parentId?: Hex;
  onSubmitSuccess: OnSubmitSuccessFunction;
};

export function CommentDefaultForm({
  parentId,
  onSubmitSuccess,
}: CommentDefaultFormProps) {
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();

  const handleSubmitComment = useCallback<OnSubmitFunction<"post" | "yoink">>(
    async ({ address, content, submitAction }) => {
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
        writeContractAsync(params) {
          if (submitAction === "yoink") {
            return postCommentViaYoink(
              {
                appSignature: params.signature,
                commentData: params.data,
              },
              writeContractAsync
            );
          }

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
    <CommentForm
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
            {formState === "post" ? "Posting..." : "Comment"}
          </Button>
          {publicEnv.NEXT_PUBLIC_YOINK_CONTRACT_ADDRESS && (
            <Button
              name="action"
              value="yoink"
              type="submit"
              className="bg-purple-500 text-white px-4 py-2 rounded"
              disabled={isSubmitting || !isContentValid}
            >
              {formState === "yoink" ? "Yoinking..." : "Yoink with comment"}
            </Button>
          )}
        </>
      )}
    />
  );
}
