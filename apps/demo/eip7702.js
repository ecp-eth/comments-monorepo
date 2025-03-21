import {
  createWalletClient,
  encodeFunctionData,
  http,
  parseAbi,
  createPublicClient,
  parseEther,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { anvil } from "viem/chains";
import { eip7702Actions } from "viem/experimental";
import { CommentsV1Abi } from "@ecp.eth/sdk/abis";
import {
  COMMENTS_V1_ADDRESS,
  createCommentData,
  createCommentTypedData,
} from "@ecp.eth/sdk";

/**
 * Private key of your test wallet
 */
const YOUR_PRIVATE_KEY = "0x";
/**
 * Check .env.example
 */
const BATCH_CALL_DELEGATION_CONTRACT_ADDRESS = "0x";
/**
 * Check .env.example
 */
const YOINK_CONTRACT_ADDRESS = "0x";
/**
 * Check .env file
 */
const APP_SIGNER_PRIVATE_KEY = "0x";

const BATCH_CALL_DELEGATION_CONTRACT_ABI = [
  {
    type: "function",
    name: "execute",
    inputs: [
      {
        name: "calls",
        type: "tuple[]",
        components: [
          {
            name: "data",
            type: "bytes",
          },
          {
            name: "to",
            type: "address",
          },
          {
            name: "value",
            type: "uint256",
          },
        ],
      },
    ],
    outputs: [],
    stateMutability: "payable",
  },
];

const account = privateKeyToAccount(YOUR_PRIVATE_KEY);
const signerAccount = privateKeyToAccount(APP_SIGNER_PRIVATE_KEY);
const client = createPublicClient({
  chain: anvil,
  transport: http("http://localhost:8545"),
});

const walletClient = createWalletClient({
  account,
  chain: anvil,
  transport: http("http://localhost:8545"),
}).extend(eip7702Actions());

const authorization = await walletClient.signAuthorization({
  account,
  contractAddress: BATCH_CALL_DELEGATION_CONTRACT_ADDRESS,
});

console.log(authorization);

const commentData = createCommentData({
  content: "Hello World!",
  targetUri: "http://localhost:3000",
  parentId: undefined,
  author: account.address,
  appSigner: signerAccount.address,
});

const typedCommentData = createCommentTypedData({
  commentData,
  chainId: anvil.id,
});

const appSignature = await signerAccount.signTypedData(typedCommentData);

const tx = await walletClient.writeContract({
  authorizationList: [authorization],
  address: account.address,
  abi: BATCH_CALL_DELEGATION_CONTRACT_ABI,
  functionName: "execute",
  args: [
    [
      {
        data: encodeFunctionData({
          abi: parseAbi(["function yoink()"]),
          functionName: "yoink",
          args: [],
        }),
        to: YOINK_CONTRACT_ADDRESS,
        value: 0n,
      },
      {
        data: encodeFunctionData({
          abi: CommentsV1Abi,
          functionName: "postCommentAsAuthor",
          args: [commentData, appSignature],
        }),
        to: COMMENTS_V1_ADDRESS,
        value: 0n,
      },
    ],
  ],
});

console.log(tx);

const receipt = await client.waitForTransactionReceipt({ hash: tx });

console.log(receipt);
