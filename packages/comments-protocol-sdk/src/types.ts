type Hex = `0x${string}`;

export type APIComment = {
  timestamp: Date;
  id: Hex;
  content: string;
  metadata: string;
  targetUrl: string | null;
  parentId: Hex | null;
  author: Hex;
  chainId: number;
  deletedAt: Date | null;
  appSigner: Hex;
  txHash: Hex;
  logIndex: number;
  replies: APIComment[];
};

export type APICommentsResponse = {
  results: APIComment[];
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
};
