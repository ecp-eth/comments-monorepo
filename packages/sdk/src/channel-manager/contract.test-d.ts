import { expectAssignable } from "tsd";
import { createPublicClient, createWalletClient, http } from "viem";
import {
  ChannelExistsParams,
  GetChannelOwnerParams,
  GetChannelParams,
  GetHookStatusParams,
  RegisterHookParams,
  SetHookParams,
  UpdateChannelParams,
  type CreateChannelParams,
} from "./contract.js";
import { mainnet } from "viem/chains";

const publicClient = createPublicClient({
  chain: mainnet,
  transport: http(),
});

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

expectAssignable<GetChannelParams>({
  channelId: 1n,
  readContract(args) {
    return publicClient.readContract(args);
  },
});

expectAssignable<UpdateChannelParams>({
  channelId: 1n,
  name: "My Channel",
  writeContract(args) {
    return client.writeContract({
      ...args,
      account: "0x0",
    });
  },
});

expectAssignable<ChannelExistsParams>({
  channelId: 1n,
  readContract(args) {
    return publicClient.readContract(args);
  },
});

expectAssignable<GetChannelOwnerParams>({
  channelId: 1n,
  readContract(args) {
    return publicClient.readContract(args);
  },
});

expectAssignable<SetHookParams>({
  channelId: 1n,
  hook: "0x0",
  writeContract(args) {
    return client.writeContract({ ...args, account: "0x0" });
  },
});

expectAssignable<GetHookStatusParams>({
  hookAddress: "0x0",
  readContract(args) {
    return publicClient.readContract(args);
  },
});

expectAssignable<RegisterHookParams>({
  hookAddress: "0x0",
  writeContract(args) {
    return client.writeContract({ ...args, account: "0x0" });
  },
});
