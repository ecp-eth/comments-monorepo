"use client";

import { useQuery } from "@tanstack/react-query";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useState } from "react";
import { Comment } from "./Comment";
import { CommentForm } from "./CommentForm";
import { CommentPageSchema } from "@/lib/schemas";
import { useAccount } from "wagmi";
import { useEmbedConfig } from "../EmbedConfigProvider";
import { ErrorScreen } from "../ErrorScreen";
import { LoadingScreen } from "../LoadingScreen";

export function CommentSection() {
  const { targetUri } = useEmbedConfig();
  const account = useAccount();
  const [page, setPage] = useState(0);
  const pageSize = 10;
  const isValidTargetUri = URL.canParse(targetUri);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["comments", targetUri, page],
    queryFn: async () => {
      const searchParams = new URLSearchParams({
        targetUri,
        offset: String(page * pageSize),
        limit: String(pageSize),
      });

      const response = await fetch(`/api/comments?${searchParams.toString()}`);

      if (!response.ok) {
        throw new Error("Failed to fetch comments");
      }

      return CommentPageSchema.parse(await response.json());
    },
    enabled: isValidTargetUri,
  });

  if (!isValidTargetUri) {
    return (
      <ErrorScreen description="Target URI is missing or its value isn't a valid URL." />
    );
  }

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (error) {
    return (
      <ErrorScreen
        description="Failed to load comments. Please try again."
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="max-w-2xl mx-auto mt-8">
      {account ? (
        <CommentForm onSubmitSuccess={() => refetch()} />
      ) : (
        <ConnectButton />
      )}
      {data?.results.map((comment) => (
        <Comment comment={comment} key={comment.id} />
      ))}
      {data?.pagination.hasMore && (
        <button
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
          onClick={() => setPage((prev) => prev + 1)}
        >
          Load More
        </button>
      )}
    </div>
  );
}
