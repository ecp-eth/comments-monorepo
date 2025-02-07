import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { chains } from "@/lib/wagmi";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { signTypedData } from "viem/accounts";
import {
  useAccount,
  useSignTypedData,
  useSwitchChain,
  useWaitForTransactionReceipt,
} from "wagmi";

interface CommentBoxProps {
  onSubmit: (content: string) => void;
  placeholder?: string;
  parentId?: string;
}

interface SignCommentGaslessPrepareResponse {
  signTypedDataArgs: Parameters<typeof signTypedData>[0];
  appSignature: `0x${string}`;
}

interface SignCommentGaslessResponse {
  txHash: `0x${string}`;
}

interface SignCommentGaslessRequest {
  content: string;
  targetUri?: string;
  parentId?: string;
  author: `0x${string}`;
}

export function CommentBoxGasless({
  onSubmit,
  placeholder = "What are your thoughts?",
  parentId,
}: CommentBoxProps) {
  const { address } = useAccount();
  const { switchChain } = useSwitchChain();
  const [content, setContent] = useState("");
  const [pendingTxHash, setPendingTxHash] = useState<`0x${string}`>();

  const postSignatureMutation = useMutation({
    mutationFn: async ({
      commentData,
      appSignature,
      authorSignature,
    }: {
      commentData: any;
      appSignature: `0x${string}`;
      authorSignature: `0x${string}`;
    }) => {
      const response = await fetch("/api/sign-comment/gasless", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          commentData,
          appSignature,
          authorSignature,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to post comment");
      }

      return response.json() as Promise<SignCommentGaslessResponse>;
    },
  });

  const { data: receipt, isLoading: isReceiptLoading } =
    useWaitForTransactionReceipt({
      hash: pendingTxHash,
    });

  const prepareCommentMutation = useMutation({
    mutationFn: async (data: SignCommentGaslessRequest) => {
      switchChain({ chainId: chains[0].id });
      setPendingTxHash(undefined);

      const response = await fetch("/api/sign-comment/gasless/prepare", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...data, submitIfApproved: true }),
      });

      if (!response.ok) {
        throw new Error("Failed to sign comment");
      }

      return response.json() as Promise<
        SignCommentGaslessPrepareResponse | SignCommentGaslessResponse
      >;
    },
  });

  const { signTypedData, isPending: isSignaturePending } = useSignTypedData();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !address) return;

    try {
      prepareCommentMutation.mutate(
        {
          content,
          targetUri: window.location.href,
          parentId,
          author: address as `0x${string}`,
        },
        {
          onSuccess(commentDataRes) {
            if ("txHash" in commentDataRes) {
              // Comment already submitted via approval, wait for receipt
              setPendingTxHash(commentDataRes.txHash);
            } else {
              // Sign comment for once-off approval
              signTypedData(commentDataRes.signTypedDataArgs, {
                onSuccess(authorSignature) {
                  postSignatureMutation.mutate(
                    {
                      commentData: commentDataRes.signTypedDataArgs.message,
                      appSignature: commentDataRes.appSignature,
                      authorSignature,
                    },
                    {
                      onSuccess(data) {
                        setPendingTxHash(data.txHash);
                      },
                    }
                  );
                },
              });
            }
          },
        }
      );
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
    isSignaturePending ||
    isReceiptLoading ||
    prepareCommentMutation.isPending ||
    postSignatureMutation.isPending;

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
