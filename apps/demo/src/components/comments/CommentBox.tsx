import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useState } from "react";
import { useAccount, useWaitForTransactionReceipt } from "wagmi";
import { usePostCommentAsAuthor } from "@ecp.eth/sdk/wagmi";
import type { Hex } from "@ecp.eth/sdk/types";
import { toast } from "sonner";
import { signCommentForPostingAsAuthor } from "@/lib/operations";
import { chains } from "@/lib/wagmi";

interface CommentBoxProps {
  onSubmit: (content: string) => void;
  placeholder?: string;
  parentId?: Hex;
}

export function CommentBox({
  onSubmit,
  placeholder = "What are your thoughts?",
  parentId,
}: CommentBoxProps) {
  const { address } = useAccount();
  const [content, setContent] = useState("");
  const postCommentMutation = usePostCommentAsAuthor({
    fetchCommentSignature(comment) {
      return signCommentForPostingAsAuthor({ comment, chainId: chains[0].id });
    },
  });

  const { data: receipt, isLoading: isReceiptLoading } =
    useWaitForTransactionReceipt({
      hash: postCommentMutation.data,
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !address) {
      console.error("Missing content or address", {
        content,
        address,
      });
      throw new Error("Missing content or address");
    }

    try {
      postCommentMutation.mutate({
        comment: {
          author: address as `0x${string}`,
          content,
          targetUri: window.location.href,
          parentId,
        },
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
          disabled={isLoading || !address || !content.trim()}
        >
          {isLoading ? "Posting..." : "Comment"}
        </Button>
      </div>
    </form>
  );
}
