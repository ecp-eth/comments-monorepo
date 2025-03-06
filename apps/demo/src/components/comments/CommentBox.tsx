import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  COMMENTS_V1_ADDRESS,
  CommentsV1Abi,
  createCommentSuffixData,
  fetchAuthorData,
} from "@ecp.eth/sdk";
import type { Hex } from "@ecp.eth/sdk/schemas";
import { useMutation, useQuery } from "@tanstack/react-query";
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
import { getCommentAuthorNameOrAddress } from "./helpers";
import { CommentAuthorAvatar } from "./CommentAuthorAvatar";

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
  const { switchChainAsync } = useSwitchChain();
  const [content, setContent] = useState("");
  const { writeContractAsync } = useWriteContract();
  const [formState, setFormState] = useState<"posting" | "yoinking" | "idle">(
    "idle"
  );

  const submitMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      try {
        if (!content.trim() || !address) {
          return;
        }

        const submitAction = formData.get("action") as "post" | "yoink";

        setFormState(submitAction === "post" ? "posting" : "yoinking");

        await switchChainAsync({ chainId: chains[0].id });

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
          const yoinkContractAddress =
            process.env.NEXT_PUBLIC_YOINK_CONTRACT_ADDRESS;

          if (!yoinkContractAddress) {
            throw new Error("Yoink contract address is not set");
          }

          const commentDataSuffix = createCommentSuffixData({
            commentData: data.data,
            appSignature: data.signature,
          });

          return await writeContractAsync({
            address: yoinkContractAddress,
            abi: parseAbi(["function yoink()"]),
            functionName: "yoink",
            args: [],
            dataSuffix: commentDataSuffix,
          });
        }

        return await writeContractAsync({
          abi: CommentsV1Abi,
          address: COMMENTS_V1_ADDRESS,
          functionName: "postCommentAsAuthor",
          args: [data.data, data.signature],
        });
      } finally {
        setFormState("idle");
      }
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
    <form action={submitMutation.mutate} className="mb-4 flex flex-col gap-2">
      <Textarea
        name="comment"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder}
        className="w-full p-2 border border-gray-300 rounded"
        disabled={isLoading || !address}
        required
      />
      {address && <CommentBoxAuthor address={address}></CommentBoxAuthor>}
      {submitMutation.error && (
        <div className="text-xs text-red-500">
          {submitMutation.error.message}
        </div>
      )}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Button
          name="action"
          value="post"
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded"
          disabled={submitDisabled}
        >
          {formState === "posting" ? "Posting..." : "Comment"}
        </Button>
        {process.env.NEXT_PUBLIC_YOINK_CONTRACT_ADDRESS && (
          <Button
            name="action"
            value="yoink"
            type="submit"
            className="bg-purple-500 text-white px-4 py-2 rounded"
            disabled={submitDisabled}
          >
            {formState === "yoinking" ? "Yoinking..." : "Yoink with comment"}
          </Button>
        )}
      </div>
    </form>
  );
}

function CommentBoxAuthor({ address }: { address: Hex }) {
  const queryResult = useQuery({
    queryKey: ["author", address],
    queryFn: () => {
      return fetchAuthorData({
        address,
        apiUrl: process.env.NEXT_PUBLIC_COMMENTS_INDEXER_URL,
      });
    },
  });

  return (
    <div
      className="flex flex-row gap-2 items-center"
      title={`Publishing as ${getCommentAuthorNameOrAddress(queryResult.data ?? { address })}`}
    >
      <CommentAuthorAvatar author={queryResult.data ?? { address }} />
      <div className="text-xs text-gray-500">
        {getCommentAuthorNameOrAddress(queryResult.data ?? { address })}
      </div>
    </div>
  );
}
