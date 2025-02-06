import { createConfig } from "ponder";
import { http } from "viem";

import { CommentsV1Abi } from "@modprotocol/comments-protocol-sdk/abis";

export default createConfig({
  networks: {
    anvil: {
      chainId: 31337,
      transport: http("http://127.0.0.1:8545"),
      disableCache: true,
    },
  },
  contracts: {
    CommentsV1: {
      abi: CommentsV1Abi,
      network: {
        anvil: {
          address: "0xfdb8b4bb77819d9a0501c9ff3731fb45fb38d42d",
        },
      },
    },
  },
});
