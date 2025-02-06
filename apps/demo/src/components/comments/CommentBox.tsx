import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  useAccount,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { CommentsV1Abi } from "@modprotocol/comments-protocol-sdk/abis";
import { CommentData } from "../../lib/types";
import { chains } from "../../lib/wagmi";
import { toast } from "sonner";
import { COMMENTS_V1_ADDRESS } from "../../lib/addresses";

interface CommentBoxProps {
  onSubmit: (content: string) => void;
  placeholder?: string;
  parentId?: string;
}

interface SignCommentResponse {
  signature: `0x${string}`;
  hash: `0x${string}`;
  data: CommentData;
}

interface SignCommentRequest {
  content: string;
  targetUrl?: string;
  parentId?: string;
  chainId: number;
  author: `0x${string}`;
}

export function CommentBox({
  onSubmit,
  placeholder = "What are your thoughts?",
  parentId,
}: CommentBoxProps) {
  const { address } = useAccount();
  const { switchChain } = useSwitchChain();
  const [content, setContent] = useState("");

  const {
    data: txHash,
    writeContract,
    isPending: isWritePending,
  } = useWriteContract();
  const { data: receipt, isLoading: isReceiptLoading } =
    useWaitForTransactionReceipt({
      hash: txHash,
    });

  const signCommentMutation = useMutation({
    mutationFn: async (data: SignCommentRequest) => {
      switchChain({ chainId: chains[0].id });

      const response = await fetch("/api/sign-comment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to sign comment");
      }

      return response.json() as Promise<SignCommentResponse>;
    },
    onSuccess(data) {
      writeContract({
        abi: CommentsV1Abi,
        address: COMMENTS_V1_ADDRESS,
        functionName: "postCommentAsAuthor",
        args: [
          {
            ...data.data,
            deadline: BigInt(data.data.deadline),
          },
          data.signature,
        ],
      });
    },
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
      signCommentMutation.mutate({
        content,
        targetUrl: window.location.href,
        parentId,
        author: address as `0x${string}`,
        chainId: chains[0].id, // Replace with your desired chain ID
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

  const isLoading =
    isWritePending || isReceiptLoading || signCommentMutation.isPending;

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
