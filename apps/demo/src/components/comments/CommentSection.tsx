"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchComments } from "@ecp.eth/sdk";
import { useEffect, useState } from "react";
import { Comment } from "./Comment";
import { CommentBox } from "./CommentBox";

export function CommentSection() {
  const [page, setPage] = useState(0);
  const pageSize = 10;
  const [currentUrl, setCurrentUrl] = useState<string>("");

  useEffect(() => {
    setCurrentUrl(window.location.href);
  }, []);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["comments", currentUrl, page],
    queryFn: () => {
      return fetchComments({
        apiUrl: process.env.NEXT_PUBLIC_COMMENTS_INDEXER_URL,
        appSigner: process.env.NEXT_PUBLIC_APP_SIGNER_ADDRESS,
        targetUri: currentUrl,
        offset: page * pageSize,
        limit: pageSize,
      });
    },
    enabled: !!currentUrl,
  });

  if (isLoading) return <div>Loading comments...</div>;
  if (error)
    return <div>Error loading comments: {(error as Error).message}</div>;

  return (
    <div className="max-w-2xl mx-auto mt-8">
      <h2 className="text-lg font-semibold mb-4">Comments</h2>
      <CommentBox onSubmit={() => refetch()} />
      {data?.results.map((comment) => (
        <Comment
          key={comment.id}
          comment={comment}
          onReply={() => refetch()}
          onDelete={() => {
            refetch();
          }}
        />
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
