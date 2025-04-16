import { expectAssignable } from "tsd";
import { createPublicClient, createWalletClient, http } from "viem";
import {
  GetHookRegistrationFeeParams,
  GetHookStatusParams,
  GetHookTransactionFeeParams,
  RegisterHookParams,
  SetHookGloballyEnabledParams,
  SetHookParams,
  SetHookRegistrationFeeParams,
  SetHookTransactionFeeParams,
} from "./hook.js";
import { mainnet } from "viem/chains";

const publicClient = createPublicClient({
  chain: mainnet,
  transport: http(),
});

const client = createWalletClient({
  chain: mainnet,
  transport: http(),
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
