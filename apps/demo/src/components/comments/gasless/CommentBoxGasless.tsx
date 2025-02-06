import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { chains } from "@/lib/wagmi";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useGaslessPostComment } from "@modprotocol/comments-protocol-sdk/wagmi";
import { useAccount, useWaitForTransactionReceipt } from "wagmi";
import type {
  Hex,
  SignCommentRequest,
} from "@modprotocol/comments-protocol-sdk/types";

interface CommentBoxProps {
  onSubmit: (content: string) => void;
  placeholder?: string;
  parentId?: Hex;
}

export function CommentBoxGasless({
  onSubmit,
  placeholder = "What are your thoughts?",
  parentId,
}: CommentBoxProps) {
  const { address } = useAccount();
  const [content, setContent] = useState("");
  const { postComment } = useGaslessPostComment({
    // Replace with your desired chain ID
    chainId: chains[0].id,
    commentsApiUrl: process.env.NEXT_PUBLIC_URL!,
  });

  const postCommentMutation = useMutation({
    mutationFn: async (comment: SignCommentRequest) => {
      return postComment(comment);
    },
  });

  const { data: receipt, isLoading: isReceiptLoading } =
    useWaitForTransactionReceipt({
      hash: postCommentMutation.data,
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !address) return;

    try {
      postCommentMutation.mutate({
        content,
        targetUrl: window.location.href,
        parentId,
        author: address,
      });
    } catch (error) {
      console.error("Error signing comment:", error);
    }
  };

  useEffect(() => {
    if (receipt?.transactionHash) {
      toast.success("Comment posted");
      onSubmit(content);
      setContent("");
    }
  }, [receipt?.transactionHash]);

  const isLoading = isReceiptLoading || postCommentMutation.isPending;

  return (
    <form onSubmit={handleSubmit} className="mb-4 flex flex-col gap-2">
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
      <div className="flex items-center text-sm text-gray-500">
        <Button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded"
          disabled={isLoading || !content.trim() || !address}
        >
          {isLoading ? "Posting..." : "Comment"}
        </Button>
      </div>
    </form>
  );
}
