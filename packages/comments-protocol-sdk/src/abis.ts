export const CommentsV1Abi = [
  {
    type: "constructor",
    inputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "ADD_APPROVAL_TYPEHASH",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "COMMENT_TYPEHASH",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "DELETE_COMMENT_TYPEHASH",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "DOMAIN_SEPARATOR",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "REMOVE_APPROVAL_TYPEHASH",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "addApproval",
    inputs: [
      {
        name: "author",
        type: "address",
        internalType: "address",
      },
      {
        name: "appSigner",
        type: "address",
        internalType: "address",
      },
      {
        name: "nonce",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "deadline",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "signature",
        type: "bytes",
        internalType: "bytes",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "addApprovalAsAuthor",
    inputs: [
      {
        name: "appSigner",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "deleteComment",
    inputs: [
      {
        name: "commentId",
        type: "bytes32",
        internalType: "bytes32",
      },
      {
        name: "author",
        type: "address",
        internalType: "address",
      },
      {
        name: "appSigner",
        type: "address",
        internalType: "address",
      },
      {
        name: "nonce",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "deadline",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "authorSignature",
        type: "bytes",
        internalType: "bytes",
      },
      {
        name: "appSignature",
        type: "bytes",
        internalType: "bytes",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "deleteCommentAsAuthor",
    inputs: [
      {
        name: "commentId",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getAddApprovalHash",
    inputs: [
      {
        name: "author",
        type: "address",
        internalType: "address",
      },
      {
        name: "appSigner",
        type: "address",
        internalType: "address",
      },
      {
        name: "nonce",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "deadline",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getCommentId",
    inputs: [
      {
        name: "commentData",
        type: "tuple",
        internalType: "struct CommentsV1.CommentData",
        components: [
          {
            name: "content",
            type: "string",
            internalType: "string",
          },
          {
            name: "metadata",
            type: "string",
            internalType: "string",
          },
          {
            name: "targetUri",
            type: "string",
            internalType: "string",
          },
          {
            name: "parentId",
            type: "bytes32",
            internalType: "bytes32",
          },
          {
            name: "author",
            type: "address",
            internalType: "address",
          },
          {
            name: "appSigner",
            type: "address",
            internalType: "address",
          },
          {
            name: "nonce",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "deadline",
            type: "uint256",
            internalType: "uint256",
          },
        ],
      },
    ],
    outputs: [
      {
        name: "",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getDeleteCommentHash",
    inputs: [
      {
        name: "commentId",
        type: "bytes32",
        internalType: "bytes32",
      },
      {
        name: "author",
        type: "address",
        internalType: "address",
      },
      {
        name: "appSigner",
        type: "address",
        internalType: "address",
      },
      {
        name: "nonce",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "deadline",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getRemoveApprovalHash",
    inputs: [
      {
        name: "author",
        type: "address",
        internalType: "address",
      },
      {
        name: "appSigner",
        type: "address",
        internalType: "address",
      },
      {
        name: "nonce",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "deadline",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "isApproved",
    inputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [
      {
        name: "",
        type: "bool",
        internalType: "bool",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "name",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "string",
        internalType: "string",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "nonces",
    inputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "postComment",
    inputs: [
      {
        name: "commentData",
        type: "tuple",
        internalType: "struct CommentsV1.CommentData",
        components: [
          {
            name: "content",
            type: "string",
            internalType: "string",
          },
          {
            name: "metadata",
            type: "string",
            internalType: "string",
          },
          {
            name: "targetUri",
            type: "string",
            internalType: "string",
          },
          {
            name: "parentId",
            type: "bytes32",
            internalType: "bytes32",
          },
          {
            name: "author",
            type: "address",
            internalType: "address",
          },
          {
            name: "appSigner",
            type: "address",
            internalType: "address",
          },
          {
            name: "nonce",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "deadline",
            type: "uint256",
            internalType: "uint256",
          },
        ],
      },
      {
        name: "authorSignature",
        type: "bytes",
        internalType: "bytes",
      },
      {
        name: "appSignature",
        type: "bytes",
        internalType: "bytes",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "postCommentAsAuthor",
    inputs: [
      {
        name: "commentData",
        type: "tuple",
        internalType: "struct CommentsV1.CommentData",
        components: [
          {
            name: "content",
            type: "string",
            internalType: "string",
          },
          {
            name: "metadata",
            type: "string",
            internalType: "string",
          },
          {
            name: "targetUri",
            type: "string",
            internalType: "string",
          },
          {
            name: "parentId",
            type: "bytes32",
            internalType: "bytes32",
          },
          {
            name: "author",
            type: "address",
            internalType: "address",
          },
          {
            name: "appSigner",
            type: "address",
            internalType: "address",
          },
          {
            name: "nonce",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "deadline",
            type: "uint256",
            internalType: "uint256",
          },
        ],
      },
      {
        name: "appSignature",
        type: "bytes",
        internalType: "bytes",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "removeApproval",
    inputs: [
      {
        name: "author",
        type: "address",
        internalType: "address",
      },
      {
        name: "appSigner",
        type: "address",
        internalType: "address",
      },
      {
        name: "nonce",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "deadline",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "signature",
        type: "bytes",
        internalType: "bytes",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "removeApprovalAsAuthor",
    inputs: [
      {
        name: "appSigner",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "version",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "string",
        internalType: "string",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "ApprovalAdded",
    inputs: [
      {
        name: "author",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "appSigner",
        type: "address",
        indexed: true,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "ApprovalRemoved",
    inputs: [
      {
        name: "author",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "appSigner",
        type: "address",
        indexed: true,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "CommentAdded",
    inputs: [
      {
        name: "commentId",
        type: "bytes32",
        indexed: true,
        internalType: "bytes32",
      },
      {
        name: "author",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "appSigner",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "commentData",
        type: "tuple",
        indexed: false,
        internalType: "struct CommentsV1.CommentData",
        components: [
          {
            name: "content",
            type: "string",
            internalType: "string",
          },
          {
            name: "metadata",
            type: "string",
            internalType: "string",
          },
          {
            name: "targetUri",
            type: "string",
            internalType: "string",
          },
          {
            name: "parentId",
            type: "bytes32",
            internalType: "bytes32",
          },
          {
            name: "author",
            type: "address",
            internalType: "address",
          },
          {
            name: "appSigner",
            type: "address",
            internalType: "address",
          },
          {
            name: "nonce",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "deadline",
            type: "uint256",
            internalType: "uint256",
          },
        ],
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "CommentDeleted",
    inputs: [
      {
        name: "commentId",
        type: "bytes32",
        indexed: true,
        internalType: "bytes32",
      },
      {
        name: "author",
        type: "address",
        indexed: true,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    type: "error",
    name: "DeadlineReached",
    inputs: [],
  },
  {
    type: "error",
    name: "InvalidAppSignature",
    inputs: [],
  },
  {
    type: "error",
    name: "InvalidAuthor",
    inputs: [],
  },
  {
    type: "error",
    name: "InvalidAuthorSignature",
    inputs: [],
  },
  {
    type: "error",
    name: "InvalidNonce",
    inputs: [],
  },
  {
    type: "error",
    name: "NotAuthorized",
    inputs: [],
  },
] as const;
