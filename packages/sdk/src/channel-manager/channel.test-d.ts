import { expectAssignable } from "tsd";
import { createPublicClient, createWalletClient, http } from "viem";
import {
  ChannelExistsParams,
  GetChannelCreationFeeParams,
  GetChannelOwnerParams,
  GetChannelParams,
  SetChannelCreationFeeParams,
  UpdateChannelParams,
  UpdateCommentsContractParams,
  WithdrawFeesParams,
  SetBaseURIParams,
  type CreateChannelParams,
} from "./channel.js";
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

expectAssignable<GetChannelCreationFeeParams>({
  readContract(args) {
    return publicClient.readContract(args);
  },
});

expectAssignable<WithdrawFeesParams>({
  recipient: "0x0",
  writeContract(args) {
    return client.writeContract({ ...args, account: "0x0" });
  },
});

expectAssignable<SetChannelCreationFeeParams>({
  fee: 1n,
  writeContract(args) {
    return client.writeContract({ ...args, account: "0x0" });
  },
});

expectAssignable<UpdateCommentsContractParams>({
  commentsContract: "0x0",
  writeContract(args) {
    return client.writeContract({ ...args, account: "0x0" });
  },
});

expectAssignable<SetBaseURIParams>({
  baseURI: "0x0",
  writeContract(args) {
    return client.writeContract({ ...args, account: "0x0" });
  },
});
