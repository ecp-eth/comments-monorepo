import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  COMMENTS_V1_ADDRESS,
  CommentsV1Abi,
  createCommentSuffixData,
} from "@ecp.eth/sdk";
import type { Hex } from "@ecp.eth/sdk/schemas";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { parseAbi } from "viem";
import {
  useAccount,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { chains } from "../../lib/wagmi";
import { SignCommentResponseSchema } from "@/lib/schemas";
import { useFreshRef } from "@/lib/hooks";

interface CommentBoxProps {
  onSubmit: () => void;
  placeholder?: string;
  parentId?: Hex;
}

export function CommentBox({
  onSubmit,
  placeholder = "What are your thoughts?",
  parentId,
}: CommentBoxProps) {
  const onSubmitRef = useFreshRef(onSubmit);
  const { address } = useAccount();
  const { switchChain } = useSwitchChain();
  const [content, setContent] = useState("");
  const { writeContractAsync } = useWriteContract();

  const submitMutation = useMutation({
    mutationFn: async (e: React.FormEvent) => {
      e.preventDefault();

      if (!content.trim() || !address) {
        return;
      }

      const formValues = new FormData(e.currentTarget as HTMLFormElement);

      const submitAction = formValues.get("action") as "post" | "yoink";

      switchChain({ chainId: chains[0].id });

      const response = await fetch("/api/sign-comment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content,
          targetUri: window.location.href,
          parentId,
          author: address,
          chainId: chains[0].id, // Replace with your desired chain ID
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to sign comment");
      }

      const data = SignCommentResponseSchema.parse(await response.json());

      if (submitAction === "yoink") {
        const commentDataSuffix = createCommentSuffixData({
          commentData: data.data,
        });

        return writeContractAsync({
          address: "0x4bBFD120d9f352A0BEd7a014bd67913a2007a878",
          abi: parseAbi(["function yoink()"]),
          functionName: "yoink",
          args: [],
          dataSuffix: commentDataSuffix,
        });
      }

      return writeContractAsync({
        abi: CommentsV1Abi,
        address: COMMENTS_V1_ADDRESS,
        functionName: "postCommentAsAuthor",
        args: [data.data, data.signature],
      });
    },
  });

  const { data: receipt, isLoading: isReceiptLoading } =
    useWaitForTransactionReceipt({
      hash: submitMutation.data,
    });

  useEffect(() => {
    if (receipt?.status === "success") {
      toast.success("Comment posted");
      onSubmitRef.current?.();
      setContent("");
    }
  }, [receipt?.status, onSubmitRef]);

  const isLoading = isReceiptLoading || submitMutation.isPending;
  const submitDisabled = isLoading || !address || !content.trim();

  return (
    <form onSubmit={submitMutation.mutate} className="mb-4 flex flex-col gap-2">
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder}
        className="w-full p-2 border border-gray-300 rounded"
        disabled={isLoading}
      />
      {address && (
        <div className="text-xs text-gray-500">Publishing as {address}</div>
      )}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Button
          name="action"
          value="post"
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded"
          disabled={submitDisabled}
        >
          {isLoading ? "Posting..." : "Comment"}
        </Button>
        <Button
          name="action"
          value="yoink"
          type="submit"
          className="bg-purple-500 text-white px-4 py-2 rounded"
          disabled={submitDisabled}
        >
          {isLoading ? "Yoinking..." : "Yoink with comment"}
        </Button>
      </div>
    </form>
  );
}
