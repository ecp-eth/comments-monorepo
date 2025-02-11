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
import { CommentsV1Abi } from "@ecp.eth/sdk/abis";
import { chains } from "../../lib/wagmi";
import { toast } from "sonner";
import { COMMENTS_V1_ADDRESS } from "@ecp.eth/sdk";
import { useFreshRef } from "@/hooks/useFreshRef";
import { useEmbedConfig } from "../EmbedConfigProvider";
import {
  SignCommentResponseClientSchema,
  SignCommentResponseClientSchemaType,
} from "@/lib/schemas";
import type { Hex } from "@ecp.eth/sdk/schemas";

export type OnSubmitSuccessFunction = (
  response: SignCommentResponseClientSchemaType | undefined,
  extra: {
    txHash: Hex;
    chainId: number;
  }
) => void;

interface CommentBoxProps {
  onSubmitSuccess: OnSubmitSuccessFunction;
  placeholder?: string;
  parentId?: string;
}

interface SignCommentRequest {
  content: string;
  targetUri?: string;
  parentId?: string;
  chainId: number;
  author: `0x${string}`;
}

export function CommentForm({
  onSubmitSuccess,
  placeholder = "What are your thoughts?",
  parentId,
}: CommentBoxProps) {
  const { targetUri } = useEmbedConfig();
  const onSubmitSuccessRef = useFreshRef(onSubmitSuccess);
  const { address } = useAccount();
  const { switchChain } = useSwitchChain();
  const [content, setContent] = useState("");

  const postCommentContract = useWriteContract();

  const postCommentTxReceipt = useWaitForTransactionReceipt({
    hash: postCommentContract.data,
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

      return SignCommentResponseClientSchema.parse(await response.json());
    },
    onSuccess(data) {
      postCommentContract.writeContract({
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
        targetUri,
        parentId,
        author: address,
        chainId: chains[0].id, // Replace with your desired chain ID
      });
    } catch (error) {
      console.error("Error signing comment:", error);
    }
  };

  const signCommentMutationDataRef = useFreshRef(signCommentMutation.data);

  useEffect(() => {
    if (postCommentTxReceipt.data?.status === "success") {
      toast.success("Comment posted");
      onSubmitSuccessRef.current(signCommentMutationDataRef.current, {
        txHash: postCommentTxReceipt.data.transactionHash,
        chainId: postCommentTxReceipt.data.chainId,
      });
      postCommentContract.reset();
      setContent("");
    }
  }, [
    onSubmitSuccessRef,
    postCommentContract,
    postCommentTxReceipt.data?.chainId,
    postCommentTxReceipt.data?.status,
    postCommentTxReceipt.data?.transactionHash,
    signCommentMutationDataRef,
  ]);

  const isLoading =
    postCommentContract.isPending ||
    postCommentTxReceipt.isFetching ||
    signCommentMutation.isPending;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
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
