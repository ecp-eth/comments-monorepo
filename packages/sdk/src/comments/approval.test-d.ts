import { expectAssignable } from "tsd";
import { createPublicClient, createWalletClient, http } from "viem";
import { mainnet } from "viem/chains";
import type { Hex } from "../types.js";
import {
  AddApprovalParams,
  AddApprovalAsAuthorParams,
  RevokeApprovalParams,
  RevokeApprovalAsAuthorParams,
  GetAddApprovalHashParams,
} from "./approval.js";

const publicClient = createPublicClient({
  chain: mainnet,
  transport: http(),
});

const client = createWalletClient({
  chain: mainnet,
  transport: http(),
});

// Test AddApprovalAsAuthorParams
expectAssignable<AddApprovalAsAuthorParams>({
  appSigner: "0x0" as Hex,
  writeContract(params) {
    return client.writeContract({
      ...params,
      account: "0x0" as Hex,
    });
  },
});

// Test AddApprovalParams
expectAssignable<AddApprovalParams>({
  signature: "0x0" as Hex,
  author: "0x0" as Hex,
  appSigner: "0x0" as Hex,
  nonce: 0n,
  deadline: 0n,
  writeContract(params) {
    return client.writeContract({
      ...params,
      account: "0x0" as Hex,
    });
  },
});

// Test RevokeApprovalAsAuthorParams
expectAssignable<RevokeApprovalAsAuthorParams>({
  appSigner: "0x0" as Hex,
  writeContract(params) {
    return client.writeContract({
      ...params,
      account: "0x0" as Hex,
    });
  },
});

// Test RevokeApprovalParams
expectAssignable<RevokeApprovalParams>({
  author: "0x0" as Hex,
  appSigner: "0x0" as Hex,
  nonce: 0n,
  deadline: 0n,
  signature: "0x0" as Hex,
  writeContract(params) {
    return client.writeContract({
      ...params,
      account: "0x0" as Hex,
    });
  },
});

// Test GetAddApprovalHashParams
expectAssignable<GetAddApprovalHashParams>({
  author: "0x0" as Hex,
  appSigner: "0x0" as Hex,
  nonce: 0n,
  deadline: 0n,
  readContract: (args) => publicClient.readContract(args),
});
