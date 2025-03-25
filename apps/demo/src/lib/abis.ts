export const BATCH_CALL_DELEGATION_CONTRACT_ABI = [
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
