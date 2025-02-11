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
  replies: APIListCommentsResponse;
};

export type APIListCommentsResponse = {
  results: APIComment[];
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
};
