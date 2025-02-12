import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { signTypedData } from "viem/accounts";
import {
  useAccount,
  useSwitchChain,
  useWaitForTransactionReceipt,
} from "wagmi";
import { useMutation } from "@tanstack/react-query";
import { useGaslessTransaction } from "@ecp.eth/sdk/react";

interface CommentBoxProps {
  isApproved?: boolean;
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
  isApproved = false,
}: CommentBoxProps) {
  const { address } = useAccount();
  const [content, setContent] = useState("");
  const [pendingTxHash, setPendingTxHash] = useState<`0x${string}`>();

  const prepareCommentMutation = useMutation({
    mutationFn: async ({
      submitIfApproved,
    }: {
      submitIfApproved?: boolean;
    }) => {
      const response = await fetch("/api/sign-comment/gasless/prepare", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content,
          targetUri: window.location.href,
          parentId,
          author: address as `0x${string}`,
          submitIfApproved,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to sign comment");
      }

      const data = await response.json();

      return { signTypedDataArgs: data.signTypedDataArgs, variables: data };
    },
  });

  // TODO: Add mutation for approval flow
  const gaslessMutation = useGaslessTransaction({
    async prepareSignTypedData() {
      return prepareCommentMutation.mutateAsync({
        submitIfApproved: false,
      });
    },
    async sendSignedData({ signature, variables }) {
      console.log("sendSignedData", { signature, variables });

      const response = await fetch("/api/sign-comment/gasless", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...variables,
          authorSignature: signature,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to post comment");
      }

      const data = await response.json();

      return data.txHash;
    },
  });

  const { data: receipt, isLoading: isReceiptLoading } =
    useWaitForTransactionReceipt({
      hash: pendingTxHash,
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !address) return;

    try {
      if (isApproved) {
        await prepareCommentMutation.mutateAsync(
          {
            submitIfApproved: true,
          },
          {
            onSuccess(data, variables, context) {
              setPendingTxHash(data.variables.txHash);
            },
          }
        );
      } else {
        gaslessMutation.mutate(void 0, {
          onSuccess(hash) {
            setPendingTxHash(hash);
          },
        });
      }
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
    gaslessMutation.isPending ||
    isReceiptLoading ||
    prepareCommentMutation.isPending;

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
