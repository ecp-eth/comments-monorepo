export type CommentData = {
  content: string;
  metadata: string;
  targetUri: string;
  parentId: `0x${string}`;
  author: `0x${string}`;
  appSigner: `0x${string}`;
  nonce: bigint;
  deadline: bigint;
};

export type APIComment = {
  timestamp: string;
  id: `0x${string}`;
  content: string;
  metadata: string;
  targetUri: string | null;
  parentId: `0x${string}` | null;
  author: `0x${string}`;
  chainId: number;
  deletedAt: string | null;
  appSigner: `0x${string}`;
  txHash: `0x${string}`;
  logIndex: number;
  replies: CommentsResponse;
};

export type CommentsResponse = {
  results: APIComment[];
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
};
