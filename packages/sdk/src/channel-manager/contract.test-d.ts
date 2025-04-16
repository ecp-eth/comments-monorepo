import { expectAssignable } from "tsd";
import { createWalletClient, http } from "viem";
import type { CreateChannelParams } from "./contract.js";
import { mainnet } from "viem/chains";

const client = createWalletClient({
  chain: mainnet,
  transport: http(),
});

expectAssignable<CreateChannelParams>({
  writeContract(args) {
    return client.writeContract({
      ...args,
      account: "0x0",
    });
  },
  name: "My Channel",
});
