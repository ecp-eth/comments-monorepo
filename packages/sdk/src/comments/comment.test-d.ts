import { expectAssignable } from "tsd";
import { createPublicClient, createWalletClient, http } from "viem";
import { mainnet } from "viem/chains";
import type { Hex } from "../types.js";
import {
  PostCommentAsAuthorParams,
  GetCommentParams,
  GetCommentIdParams,
  DeleteCommentAsAuthorParams,
  GetDeleteCommentHashParams,
  DeleteCommentParams,
  PostCommentParams,
  GetNonceParams,
} from "./comment.js";

const publicClient = createPublicClient({
  chain: mainnet,
  transport: http(),
});

const client = createWalletClient({
  chain: mainnet,
  transport: http(),
});

// Test PostCommentAsAuthorParams
expectAssignable<PostCommentAsAuthorParams>({
  comment: {
    content: "Test comment",
    channelId: 1n,
    appSigner: "0x0" as Hex,
    nonce: 0n,
    deadline: 0n,
    parentId: "0x0" as Hex,
    author: "0x0" as Hex,
    commentType: "test",
    targetUri: "",
  },
  appSignature: "0x0" as Hex,
  writeContract(params) {
    return client.writeContract({
      ...params,
      account: "0x0" as Hex,
    });
  },
});

// Test PostCommentWithSignaturesParams
expectAssignable<PostCommentParams>({
  comment: {
    content: "Test comment",
    channelId: 1n,
    appSigner: "0x0" as Hex,
    nonce: 0n,
    deadline: 0n,
    parentId: "0x0" as Hex,
    author: "0x0" as Hex,
    commentType: "test",
    targetUri: "",
  },
  appSignature: "0x0" as Hex,
  authorSignature: "0x0" as Hex,
  writeContract(params) {
    return client.writeContract({
      ...params,
      account: "0x0" as Hex,
    });
  },
});

// Test GetCommentParams
expectAssignable<GetCommentParams>({
  commentId: "0x0" as Hex,
  readContract: (args) => publicClient.readContract(args),
});

// Test GetCommentIdParams
expectAssignable<GetCommentIdParams>({
  commentData: {
    content: "Test comment",
    metadata: { test: true },
    targetUri: "",
    commentType: "",
    channelId: 1n,
    author: "0x0" as Hex,
    appSigner: "0x0" as Hex,
    nonce: 0n,
    deadline: 0n,
    parentId: "0x0" as Hex,
  },
  readContract: (args) => publicClient.readContract(args),
});

// Test DeleteCommentAsAuthorParams
expectAssignable<DeleteCommentAsAuthorParams>({
  commentId: "0x0" as Hex,
  writeContract: async (args) =>
    client.writeContract({ ...args, account: "0x0" as Hex }),
});

// Test DeleteCommentParams
expectAssignable<DeleteCommentParams>({
  commentId: "0x0" as Hex,
  author: "0x0" as Hex,
  appSigner: "0x0" as Hex,
  nonce: 0n,
  deadline: 0n,
  authorSignature: "0x0" as Hex,
  appSignature: "0x0" as Hex,
  writeContract: async (args) =>
    client.writeContract({ ...args, account: "0x0" as Hex }),
});

// Test GetDeleteCommentHashParams
expectAssignable<GetDeleteCommentHashParams>({
  commentId: "0x0" as Hex,
  author: "0x0" as Hex,
  appSigner: "0x0" as Hex,
  nonce: 0n,
  deadline: 0n,
  readContract: (args) => publicClient.readContract(args),
});

// Test GetNonceParams
expectAssignable<GetNonceParams>({
  author: "0x0" as Hex,
  appSigner: "0x0" as Hex,
  readContract: (args) => publicClient.readContract(args),
});
