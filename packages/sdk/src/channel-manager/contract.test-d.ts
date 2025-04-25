import { expectAssignable } from "tsd";
import { createPublicClient, createWalletClient, http } from "viem";
import {
  ChannelExistsParams,
  GetChannelCreationFeeParams,
  GetChannelOwnerParams,
  GetChannelParams,
  GetHookRegistrationFeeParams,
  GetHookStatusParams,
  GetHookTransactionFeeParams,
  RegisterHookParams,
  SetBaseURIParams,
  SetChannelCreationFeeParams,
  SetHookGloballyEnabledParams,
  SetHookParams,
  SetHookRegistrationFeeParams,
  SetHookTransactionFeeParams,
  UpdateChannelParams,
  UpdateCommentsContractParams,
  WithdrawFeesParams,
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

expectAssignable<SetHookGloballyEnabledParams>({
  hookAddress: "0x0",
  enabled: true,
  writeContract(args) {
    return client.writeContract({ ...args, account: "0x0" });
  },
});

expectAssignable<GetChannelCreationFeeParams>({
  readContract(args) {
    return publicClient.readContract(args);
  },
});

expectAssignable<GetHookRegistrationFeeParams>({
  readContract(args) {
    return publicClient.readContract(args);
  },
});

expectAssignable<GetHookTransactionFeeParams>({
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

expectAssignable<SetHookRegistrationFeeParams>({
  fee: 1n,
  writeContract(args) {
    return client.writeContract({ ...args, account: "0x0" });
  },
});

expectAssignable<SetHookTransactionFeeParams>({
  feePercentage: 1000,
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
