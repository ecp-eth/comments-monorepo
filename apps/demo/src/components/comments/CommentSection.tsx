"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchComments } from "@ecp.eth/sdk";
import { useEffect, useMemo, useState } from "react";
import { Comment } from "./Comment";
import { CommentBox } from "./CommentBox";
import { publicEnv } from "@/publicEnv";
import { useOptimisticCommentingManager } from "@/hooks/useOptimisticCommentingManager";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export function CommentSection() {
  const { address: connectedAddress } = useAccount();
  const [page, setPage] = useState(0);
  const pageSize = 10;
  const [currentUrl, setCurrentUrl] = useState<string>("");
  const queryKeyPrefix = useMemo(() => ["comments", currentUrl], [currentUrl]);
  const { insertPendingCommentOperation, deletePendingCommentOperation } =
    useOptimisticCommentingManager([...queryKeyPrefix, 0]);

  useEffect(() => {
    setCurrentUrl(window.location.href);
  }, []);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [...queryKeyPrefix, page],
    queryFn: () => {
      return fetchComments({
        apiUrl: publicEnv.NEXT_PUBLIC_COMMENTS_INDEXER_URL,
        appSigner: publicEnv.NEXT_PUBLIC_APP_SIGNER_ADDRESS,
        targetUri: currentUrl,
        offset: page * pageSize,
        limit: pageSize,
      });
    },
    enabled: !!currentUrl,
  });

  if (isLoading) {
    return <div>Loading comments...</div>;
  }

  if (error) {
    return <div>Error loading comments: {(error as Error).message}</div>;
  }

  return (
    <div className="max-w-2xl mx-auto mt-8 flex flex-col gap-4">
      <h2 className="text-lg font-semibold mb-4">Comments</h2>
      <CommentBox
        onSubmit={async (pendingCommentOperation) => {
          // take the user to first page so they can see the comment posted
          setPage(0);

          insertPendingCommentOperation(pendingCommentOperation);

          // trigger a refetch
          refetch();
        }}
      />
      {data?.results.map((comment) => (
        <Comment
          key={comment.id}
          comment={comment}
          onReply={(pendingCommentOperation) => {
            insertPendingCommentOperation(pendingCommentOperation);

            refetch();
          }}
          onDelete={(id) => {
            deletePendingCommentOperation(id);
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
