"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { CommentsResponse } from "../../lib/types";
import { Comment } from "./Comment";
import { CommentBox } from "./CommentBox";

export function CommentSection() {
  const [page, setPage] = useState(0);
  const pageSize = 10;
  const [currentUrl, setCurrentUrl] = useState<string>("");

  useEffect(() => {
    setCurrentUrl(window.location.href);
  }, []);

  const { data, isLoading, error, refetch } = useQuery<CommentsResponse>({
    queryKey: ["comments", currentUrl, page],
    queryFn: async () => {
      const url = new URL("/api/comments", currentUrl);
      url.searchParams.set("targetUri", currentUrl);
      url.searchParams.set("offset", String(page * pageSize));
      url.searchParams.set("limit", String(pageSize));

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch comments");
      }
      return response.json();
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
