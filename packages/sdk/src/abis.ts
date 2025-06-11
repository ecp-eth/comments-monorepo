/**
 * ABI of the CommentManager contract.
 */
export const CommentManagerABI = [
  {
    type: "constructor",
    inputs: [
      {
        name: "initialOwner",
        type: "address",
        internalType: "address",
      },
    ],
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
    name: "ADD_COMMENT_TYPEHASH",
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
    name: "EDIT_COMMENT_TYPEHASH",
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
        name: "app",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "addApprovalWithSig",
    inputs: [
      {
        name: "author",
        type: "address",
        internalType: "address",
      },
      {
        name: "app",
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
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "channelManager",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "contract IChannelManager",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "commentHookMetadata",
    inputs: [
      {
        name: "",
        type: "bytes32",
        internalType: "bytes32",
      },
      {
        name: "",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    outputs: [
      {
        name: "",
        type: "bytes",
        internalType: "bytes",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "commentHookMetadataKeys",
    inputs: [
      {
        name: "",
        type: "bytes32",
        internalType: "bytes32",
      },
      {
        name: "",
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
    name: "commentMetadata",
    inputs: [
      {
        name: "",
        type: "bytes32",
        internalType: "bytes32",
      },
      {
        name: "",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    outputs: [
      {
        name: "",
        type: "bytes",
        internalType: "bytes",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "commentMetadataKeys",
    inputs: [
      {
        name: "",
        type: "bytes32",
        internalType: "bytes32",
      },
      {
        name: "",
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
    name: "deleteComment",
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
    name: "deleteCommentWithSig",
    inputs: [
      {
        name: "commentId",
        type: "bytes32",
        internalType: "bytes32",
      },
      {
        name: "app",
        type: "address",
        internalType: "address",
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
    name: "editComment",
    inputs: [
      {
        name: "commentId",
        type: "bytes32",
        internalType: "bytes32",
      },
      {
        name: "editData",
        type: "tuple",
        internalType: "struct Comments.EditComment",
        components: [
          {
            name: "app",
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
            name: "content",
            type: "string",
            internalType: "string",
          },
          {
            name: "metadata",
            type: "tuple[]",
            internalType: "struct Metadata.MetadataEntry[]",
            components: [
              {
                name: "key",
                type: "bytes32",
                internalType: "bytes32",
              },
              {
                name: "value",
                type: "bytes",
                internalType: "bytes",
              },
            ],
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
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "editCommentWithSig",
    inputs: [
      {
        name: "commentId",
        type: "bytes32",
        internalType: "bytes32",
      },
      {
        name: "editData",
        type: "tuple",
        internalType: "struct Comments.EditComment",
        components: [
          {
            name: "app",
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
            name: "content",
            type: "string",
            internalType: "string",
          },
          {
            name: "metadata",
            type: "tuple[]",
            internalType: "struct Metadata.MetadataEntry[]",
            components: [
              {
                name: "key",
                type: "bytes32",
                internalType: "bytes32",
              },
              {
                name: "value",
                type: "bytes",
                internalType: "bytes",
              },
            ],
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
    stateMutability: "payable",
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
        name: "app",
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
    name: "getComment",
    inputs: [
      {
        name: "commentId",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    outputs: [
      {
        name: "",
        type: "tuple",
        internalType: "struct Comments.Comment",
        components: [
          {
            name: "author",
            type: "address",
            internalType: "address",
          },
          {
            name: "createdAt",
            type: "uint96",
            internalType: "uint96",
          },
          {
            name: "app",
            type: "address",
            internalType: "address",
          },
          {
            name: "updatedAt",
            type: "uint88",
            internalType: "uint88",
          },
          {
            name: "commentType",
            type: "uint8",
            internalType: "uint8",
          },
          {
            name: "channelId",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "parentId",
            type: "bytes32",
            internalType: "bytes32",
          },
          {
            name: "content",
            type: "string",
            internalType: "string",
          },
          {
            name: "targetUri",
            type: "string",
            internalType: "string",
          },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getCommentHookMetadata",
    inputs: [
      {
        name: "commentId",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        internalType: "struct Metadata.MetadataEntry[]",
        components: [
          {
            name: "key",
            type: "bytes32",
            internalType: "bytes32",
          },
          {
            name: "value",
            type: "bytes",
            internalType: "bytes",
          },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getCommentHookMetadataKeys",
    inputs: [
      {
        name: "commentId",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    outputs: [
      {
        name: "",
        type: "bytes32[]",
        internalType: "bytes32[]",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getCommentHookMetadataValue",
    inputs: [
      {
        name: "commentId",
        type: "bytes32",
        internalType: "bytes32",
      },
      {
        name: "key",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    outputs: [
      {
        name: "",
        type: "bytes",
        internalType: "bytes",
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
        internalType: "struct Comments.CreateComment",
        components: [
          {
            name: "author",
            type: "address",
            internalType: "address",
          },
          {
            name: "app",
            type: "address",
            internalType: "address",
          },
          {
            name: "channelId",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "deadline",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "parentId",
            type: "bytes32",
            internalType: "bytes32",
          },
          {
            name: "commentType",
            type: "uint8",
            internalType: "uint8",
          },
          {
            name: "content",
            type: "string",
            internalType: "string",
          },
          {
            name: "metadata",
            type: "tuple[]",
            internalType: "struct Metadata.MetadataEntry[]",
            components: [
              {
                name: "key",
                type: "bytes32",
                internalType: "bytes32",
              },
              {
                name: "value",
                type: "bytes",
                internalType: "bytes",
              },
            ],
          },
          {
            name: "targetUri",
            type: "string",
            internalType: "string",
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
    name: "getCommentMetadata",
    inputs: [
      {
        name: "commentId",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        internalType: "struct Metadata.MetadataEntry[]",
        components: [
          {
            name: "key",
            type: "bytes32",
            internalType: "bytes32",
          },
          {
            name: "value",
            type: "bytes",
            internalType: "bytes",
          },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getCommentMetadataKeys",
    inputs: [
      {
        name: "commentId",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    outputs: [
      {
        name: "",
        type: "bytes32[]",
        internalType: "bytes32[]",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getCommentMetadataValue",
    inputs: [
      {
        name: "commentId",
        type: "bytes32",
        internalType: "bytes32",
      },
      {
        name: "key",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    outputs: [
      {
        name: "",
        type: "bytes",
        internalType: "bytes",
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
        name: "app",
        type: "address",
        internalType: "address",
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
    name: "getEditCommentHash",
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
        name: "editData",
        type: "tuple",
        internalType: "struct Comments.EditComment",
        components: [
          {
            name: "app",
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
            name: "content",
            type: "string",
            internalType: "string",
          },
          {
            name: "metadata",
            type: "tuple[]",
            internalType: "struct Metadata.MetadataEntry[]",
            components: [
              {
                name: "key",
                type: "bytes32",
                internalType: "bytes32",
              },
              {
                name: "value",
                type: "bytes",
                internalType: "bytes",
              },
            ],
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
    name: "getNonce",
    inputs: [
      {
        name: "author",
        type: "address",
        internalType: "address",
      },
      {
        name: "app",
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
    name: "getRemoveApprovalHash",
    inputs: [
      {
        name: "author",
        type: "address",
        internalType: "address",
      },
      {
        name: "app",
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
        name: "author",
        type: "address",
        internalType: "address",
      },
      {
        name: "app",
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
    name: "isDeleted",
    inputs: [
      {
        name: "commentId",
        type: "bytes32",
        internalType: "bytes32",
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
    name: "owner",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "paused",
    inputs: [],
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
    name: "postComment",
    inputs: [
      {
        name: "commentData",
        type: "tuple",
        internalType: "struct Comments.CreateComment",
        components: [
          {
            name: "author",
            type: "address",
            internalType: "address",
          },
          {
            name: "app",
            type: "address",
            internalType: "address",
          },
          {
            name: "channelId",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "deadline",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "parentId",
            type: "bytes32",
            internalType: "bytes32",
          },
          {
            name: "commentType",
            type: "uint8",
            internalType: "uint8",
          },
          {
            name: "content",
            type: "string",
            internalType: "string",
          },
          {
            name: "metadata",
            type: "tuple[]",
            internalType: "struct Metadata.MetadataEntry[]",
            components: [
              {
                name: "key",
                type: "bytes32",
                internalType: "bytes32",
              },
              {
                name: "value",
                type: "bytes",
                internalType: "bytes",
              },
            ],
          },
          {
            name: "targetUri",
            type: "string",
            internalType: "string",
          },
        ],
      },
      {
        name: "appSignature",
        type: "bytes",
        internalType: "bytes",
      },
    ],
    outputs: [
      {
        name: "",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "postCommentWithSig",
    inputs: [
      {
        name: "commentData",
        type: "tuple",
        internalType: "struct Comments.CreateComment",
        components: [
          {
            name: "author",
            type: "address",
            internalType: "address",
          },
          {
            name: "app",
            type: "address",
            internalType: "address",
          },
          {
            name: "channelId",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "deadline",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "parentId",
            type: "bytes32",
            internalType: "bytes32",
          },
          {
            name: "commentType",
            type: "uint8",
            internalType: "uint8",
          },
          {
            name: "content",
            type: "string",
            internalType: "string",
          },
          {
            name: "metadata",
            type: "tuple[]",
            internalType: "struct Metadata.MetadataEntry[]",
            components: [
              {
                name: "key",
                type: "bytes32",
                internalType: "bytes32",
              },
              {
                name: "value",
                type: "bytes",
                internalType: "bytes",
              },
            ],
          },
          {
            name: "targetUri",
            type: "string",
            internalType: "string",
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
    outputs: [
      {
        name: "",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "removeApprovalWithSig",
    inputs: [
      {
        name: "author",
        type: "address",
        internalType: "address",
      },
      {
        name: "app",
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
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "renounceOwnership",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "revokeApproval",
    inputs: [
      {
        name: "app",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "transferOwnership",
    inputs: [
      {
        name: "newOwner",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "updateChannelContract",
    inputs: [
      {
        name: "_channelContract",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "updateCommentHookData",
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
        name: "app",
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
        name: "app",
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
        name: "app",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "channelId",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "parentId",
        type: "bytes32",
        indexed: false,
        internalType: "bytes32",
      },
      {
        name: "createdAt",
        type: "uint96",
        indexed: false,
        internalType: "uint96",
      },
      {
        name: "content",
        type: "string",
        indexed: false,
        internalType: "string",
      },
      {
        name: "targetUri",
        type: "string",
        indexed: false,
        internalType: "string",
      },
      {
        name: "commentType",
        type: "uint8",
        indexed: false,
        internalType: "uint8",
      },
      {
        name: "metadata",
        type: "tuple[]",
        indexed: false,
        internalType: "struct Metadata.MetadataEntry[]",
        components: [
          {
            name: "key",
            type: "bytes32",
            internalType: "bytes32",
          },
          {
            name: "value",
            type: "bytes",
            internalType: "bytes",
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
    type: "event",
    name: "CommentEdited",
    inputs: [
      {
        name: "commentId",
        type: "bytes32",
        indexed: true,
        internalType: "bytes32",
      },
      {
        name: "editedByApp",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "author",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "app",
        type: "address",
        indexed: false,
        internalType: "address",
      },
      {
        name: "channelId",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "parentId",
        type: "bytes32",
        indexed: false,
        internalType: "bytes32",
      },
      {
        name: "createdAt",
        type: "uint96",
        indexed: false,
        internalType: "uint96",
      },
      {
        name: "updatedAt",
        type: "uint96",
        indexed: false,
        internalType: "uint96",
      },
      {
        name: "content",
        type: "string",
        indexed: false,
        internalType: "string",
      },
      {
        name: "targetUri",
        type: "string",
        indexed: false,
        internalType: "string",
      },
      {
        name: "commentType",
        type: "uint8",
        indexed: false,
        internalType: "uint8",
      },
      {
        name: "metadata",
        type: "tuple[]",
        indexed: false,
        internalType: "struct Metadata.MetadataEntry[]",
        components: [
          {
            name: "key",
            type: "bytes32",
            internalType: "bytes32",
          },
          {
            name: "value",
            type: "bytes",
            internalType: "bytes",
          },
        ],
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "CommentHookMetadataSet",
    inputs: [
      {
        name: "commentId",
        type: "bytes32",
        indexed: true,
        internalType: "bytes32",
      },
      {
        name: "key",
        type: "bytes32",
        indexed: true,
        internalType: "bytes32",
      },
      {
        name: "value",
        type: "bytes",
        indexed: false,
        internalType: "bytes",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "CommentMetadataSet",
    inputs: [
      {
        name: "commentId",
        type: "bytes32",
        indexed: true,
        internalType: "bytes32",
      },
      {
        name: "key",
        type: "bytes32",
        indexed: true,
        internalType: "bytes32",
      },
      {
        name: "value",
        type: "bytes",
        indexed: false,
        internalType: "bytes",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "OwnershipTransferred",
    inputs: [
      {
        name: "previousOwner",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "newOwner",
        type: "address",
        indexed: true,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "Paused",
    inputs: [
      {
        name: "account",
        type: "address",
        indexed: false,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "Unpaused",
    inputs: [
      {
        name: "account",
        type: "address",
        indexed: false,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    type: "error",
    name: "ChannelDoesNotExist",
    inputs: [],
  },
  {
    type: "error",
    name: "CommentDoesNotExist",
    inputs: [],
  },
  {
    type: "error",
    name: "EnforcedPause",
    inputs: [],
  },
  {
    type: "error",
    name: "ExpectedPause",
    inputs: [],
  },
  {
    type: "error",
    name: "HookNotEnabled",
    inputs: [],
  },
  {
    type: "error",
    name: "InvalidAppSignature",
    inputs: [],
  },
  {
    type: "error",
    name: "InvalidAuthorSignature",
    inputs: [],
  },
  {
    type: "error",
    name: "InvalidCommentReference",
    inputs: [
      {
        name: "message",
        type: "string",
        internalType: "string",
      },
    ],
  },
  {
    type: "error",
    name: "InvalidNonce",
    inputs: [
      {
        name: "author",
        type: "address",
        internalType: "address",
      },
      {
        name: "app",
        type: "address",
        internalType: "address",
      },
      {
        name: "expected",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "provided",
        type: "uint256",
        internalType: "uint256",
      },
    ],
  },
  {
    type: "error",
    name: "InvalidSignatureLength",
    inputs: [],
  },
  {
    type: "error",
    name: "InvalidSignatureS",
    inputs: [],
  },
  {
    type: "error",
    name: "NotAuthorized",
    inputs: [
      {
        name: "caller",
        type: "address",
        internalType: "address",
      },
      {
        name: "requiredCaller",
        type: "address",
        internalType: "address",
      },
    ],
  },
  {
    type: "error",
    name: "OwnableInvalidOwner",
    inputs: [
      {
        name: "owner",
        type: "address",
        internalType: "address",
      },
    ],
  },
  {
    type: "error",
    name: "OwnableUnauthorizedAccount",
    inputs: [
      {
        name: "account",
        type: "address",
        internalType: "address",
      },
    ],
  },
  {
    type: "error",
    name: "ParentCommentHasNeverExisted",
    inputs: [],
  },
  {
    type: "error",
    name: "ReentrancyGuardReentrantCall",
    inputs: [],
  },
  {
    type: "error",
    name: "SignatureDeadlineReached",
    inputs: [
      {
        name: "deadline",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "currentTime",
        type: "uint256",
        internalType: "uint256",
      },
    ],
  },
  {
    type: "error",
    name: "ZeroAddress",
    inputs: [],
  },
] as const;

/**
 * ABI of the ChannelManager contract.
 */
export const ChannelManagerABI = [
  {
    type: "constructor",
    inputs: [
      {
        name: "initialOwner",
        type: "address",
        internalType: "address",
      },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "approve",
    inputs: [
      {
        name: "to",
        type: "address",
        internalType: "address",
      },
      {
        name: "tokenId",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "balanceOf",
    inputs: [
      {
        name: "owner",
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
    name: "channelExists",
    inputs: [
      {
        name: "channelId",
        type: "uint256",
        internalType: "uint256",
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
    name: "channelMetadata",
    inputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    outputs: [
      {
        name: "",
        type: "bytes",
        internalType: "bytes",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "channelMetadataKeys",
    inputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "",
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
    name: "createChannel",
    inputs: [
      {
        name: "name",
        type: "string",
        internalType: "string",
      },
      {
        name: "description",
        type: "string",
        internalType: "string",
      },
      {
        name: "metadata",
        type: "tuple[]",
        internalType: "struct Metadata.MetadataEntry[]",
        components: [
          {
            name: "key",
            type: "bytes32",
            internalType: "bytes32",
          },
          {
            name: "value",
            type: "bytes",
            internalType: "bytes",
          },
        ],
      },
      {
        name: "hook",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [
      {
        name: "channelId",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "deductProtocolHookTransactionFee",
    inputs: [
      {
        name: "value",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "hookValue",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getApproved",
    inputs: [
      {
        name: "tokenId",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getChannel",
    inputs: [
      {
        name: "channelId",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "",
        type: "tuple",
        internalType: "struct Channels.Channel",
        components: [
          {
            name: "name",
            type: "string",
            internalType: "string",
          },
          {
            name: "description",
            type: "string",
            internalType: "string",
          },
          {
            name: "metadata",
            type: "tuple[]",
            internalType: "struct Metadata.MetadataEntry[]",
            components: [
              {
                name: "key",
                type: "bytes32",
                internalType: "bytes32",
              },
              {
                name: "value",
                type: "bytes",
                internalType: "bytes",
              },
            ],
          },
          {
            name: "hook",
            type: "address",
            internalType: "address",
          },
          {
            name: "permissions",
            type: "tuple",
            internalType: "struct Hooks.Permissions",
            components: [
              {
                name: "onInitialize",
                type: "bool",
                internalType: "bool",
              },
              {
                name: "onCommentAdd",
                type: "bool",
                internalType: "bool",
              },
              {
                name: "onCommentDelete",
                type: "bool",
                internalType: "bool",
              },
              {
                name: "onCommentEdit",
                type: "bool",
                internalType: "bool",
              },
              {
                name: "onChannelUpdate",
                type: "bool",
                internalType: "bool",
              },
              {
                name: "onCommentHookDataUpdate",
                type: "bool",
                internalType: "bool",
              },
            ],
          },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getChannelCreationFee",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint96",
        internalType: "uint96",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getChannelId",
    inputs: [
      {
        name: "creator",
        type: "address",
        internalType: "address",
      },
      {
        name: "name",
        type: "string",
        internalType: "string",
      },
      {
        name: "description",
        type: "string",
        internalType: "string",
      },
      {
        name: "metadata",
        type: "tuple[]",
        internalType: "struct Metadata.MetadataEntry[]",
        components: [
          {
            name: "key",
            type: "bytes32",
            internalType: "bytes32",
          },
          {
            name: "value",
            type: "bytes",
            internalType: "bytes",
          },
        ],
      },
    ],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "pure",
  },
  {
    type: "function",
    name: "getChannelMetadata",
    inputs: [
      {
        name: "channelId",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        internalType: "struct Metadata.MetadataEntry[]",
        components: [
          {
            name: "key",
            type: "bytes32",
            internalType: "bytes32",
          },
          {
            name: "value",
            type: "bytes",
            internalType: "bytes",
          },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getChannelMetadataKeys",
    inputs: [
      {
        name: "channelId",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "",
        type: "bytes32[]",
        internalType: "bytes32[]",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getChannelMetadataValue",
    inputs: [
      {
        name: "channelId",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "key",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    outputs: [
      {
        name: "",
        type: "bytes",
        internalType: "bytes",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getHookTransactionFee",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint16",
        internalType: "uint16",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "isApprovedForAll",
    inputs: [
      {
        name: "owner",
        type: "address",
        internalType: "address",
      },
      {
        name: "operator",
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
    name: "owner",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "ownerOf",
    inputs: [
      {
        name: "tokenId",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "renounceOwnership",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "safeTransferFrom",
    inputs: [
      {
        name: "from",
        type: "address",
        internalType: "address",
      },
      {
        name: "to",
        type: "address",
        internalType: "address",
      },
      {
        name: "tokenId",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "safeTransferFrom",
    inputs: [
      {
        name: "from",
        type: "address",
        internalType: "address",
      },
      {
        name: "to",
        type: "address",
        internalType: "address",
      },
      {
        name: "tokenId",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "data",
        type: "bytes",
        internalType: "bytes",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "setApprovalForAll",
    inputs: [
      {
        name: "operator",
        type: "address",
        internalType: "address",
      },
      {
        name: "approved",
        type: "bool",
        internalType: "bool",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "setBaseURI",
    inputs: [
      {
        name: "baseURI_",
        type: "string",
        internalType: "string",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "setChannelCreationFee",
    inputs: [
      {
        name: "fee",
        type: "uint96",
        internalType: "uint96",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "setChannelMetadata",
    inputs: [
      {
        name: "channelId",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "metadata",
        type: "tuple[]",
        internalType: "struct Metadata.MetadataEntry[]",
        components: [
          {
            name: "key",
            type: "bytes32",
            internalType: "bytes32",
          },
          {
            name: "value",
            type: "bytes",
            internalType: "bytes",
          },
        ],
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "setHook",
    inputs: [
      {
        name: "channelId",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "hook",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "setHookTransactionFee",
    inputs: [
      {
        name: "feeBasisPoints",
        type: "uint16",
        internalType: "uint16",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "supportsInterface",
    inputs: [
      {
        name: "interfaceId",
        type: "bytes4",
        internalType: "bytes4",
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
    name: "symbol",
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
    name: "tokenByIndex",
    inputs: [
      {
        name: "index",
        type: "uint256",
        internalType: "uint256",
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
    name: "tokenOfOwnerByIndex",
    inputs: [
      {
        name: "owner",
        type: "address",
        internalType: "address",
      },
      {
        name: "index",
        type: "uint256",
        internalType: "uint256",
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
    name: "tokenURI",
    inputs: [
      {
        name: "tokenId",
        type: "uint256",
        internalType: "uint256",
      },
    ],
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
    name: "totalSupply",
    inputs: [],
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
    name: "transferFrom",
    inputs: [
      {
        name: "from",
        type: "address",
        internalType: "address",
      },
      {
        name: "to",
        type: "address",
        internalType: "address",
      },
      {
        name: "tokenId",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "transferOwnership",
    inputs: [
      {
        name: "newOwner",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "updateChannel",
    inputs: [
      {
        name: "channelId",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "name",
        type: "string",
        internalType: "string",
      },
      {
        name: "description",
        type: "string",
        internalType: "string",
      },
      {
        name: "metadata",
        type: "tuple[]",
        internalType: "struct Metadata.MetadataEntry[]",
        components: [
          {
            name: "key",
            type: "bytes32",
            internalType: "bytes32",
          },
          {
            name: "value",
            type: "bytes",
            internalType: "bytes",
          },
        ],
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "updateCommentsContract",
    inputs: [
      {
        name: "_commentsContract",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "withdrawFees",
    inputs: [
      {
        name: "recipient",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [
      {
        name: "amount",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "event",
    name: "Approval",
    inputs: [
      {
        name: "owner",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "approved",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "tokenId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "ApprovalForAll",
    inputs: [
      {
        name: "owner",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "operator",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "approved",
        type: "bool",
        indexed: false,
        internalType: "bool",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "BaseURIUpdated",
    inputs: [
      {
        name: "baseURI",
        type: "string",
        indexed: false,
        internalType: "string",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "ChannelCreated",
    inputs: [
      {
        name: "channelId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      {
        name: "name",
        type: "string",
        indexed: false,
        internalType: "string",
      },
      {
        name: "description",
        type: "string",
        indexed: false,
        internalType: "string",
      },
      {
        name: "metadata",
        type: "tuple[]",
        indexed: false,
        internalType: "struct Metadata.MetadataEntry[]",
        components: [
          {
            name: "key",
            type: "bytes32",
            internalType: "bytes32",
          },
          {
            name: "value",
            type: "bytes",
            internalType: "bytes",
          },
        ],
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "ChannelCreationFeeUpdated",
    inputs: [
      {
        name: "newFee",
        type: "uint96",
        indexed: false,
        internalType: "uint96",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "ChannelMetadataSet",
    inputs: [
      {
        name: "channelId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      {
        name: "key",
        type: "bytes32",
        indexed: false,
        internalType: "bytes32",
      },
      {
        name: "value",
        type: "bytes",
        indexed: false,
        internalType: "bytes",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "ChannelUpdated",
    inputs: [
      {
        name: "channelId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      {
        name: "name",
        type: "string",
        indexed: false,
        internalType: "string",
      },
      {
        name: "description",
        type: "string",
        indexed: false,
        internalType: "string",
      },
      {
        name: "metadata",
        type: "tuple[]",
        indexed: false,
        internalType: "struct Metadata.MetadataEntry[]",
        components: [
          {
            name: "key",
            type: "bytes32",
            internalType: "bytes32",
          },
          {
            name: "value",
            type: "bytes",
            internalType: "bytes",
          },
        ],
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "FeesWithdrawn",
    inputs: [
      {
        name: "recipient",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "amount",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "HookSet",
    inputs: [
      {
        name: "channelId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      {
        name: "hook",
        type: "address",
        indexed: true,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "HookStatusUpdated",
    inputs: [
      {
        name: "channelId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      {
        name: "hook",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "enabled",
        type: "bool",
        indexed: false,
        internalType: "bool",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "HookTransactionFeeUpdated",
    inputs: [
      {
        name: "newBasisPoints",
        type: "uint16",
        indexed: false,
        internalType: "uint16",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "OwnershipTransferred",
    inputs: [
      {
        name: "previousOwner",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "newOwner",
        type: "address",
        indexed: true,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "Transfer",
    inputs: [
      {
        name: "from",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "to",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "tokenId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "error",
    name: "ChannelAlreadyExists",
    inputs: [],
  },
  {
    type: "error",
    name: "ChannelDoesNotExist",
    inputs: [],
  },
  {
    type: "error",
    name: "ERC721EnumerableForbiddenBatchMint",
    inputs: [],
  },
  {
    type: "error",
    name: "ERC721IncorrectOwner",
    inputs: [
      {
        name: "sender",
        type: "address",
        internalType: "address",
      },
      {
        name: "tokenId",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "owner",
        type: "address",
        internalType: "address",
      },
    ],
  },
  {
    type: "error",
    name: "ERC721InsufficientApproval",
    inputs: [
      {
        name: "operator",
        type: "address",
        internalType: "address",
      },
      {
        name: "tokenId",
        type: "uint256",
        internalType: "uint256",
      },
    ],
  },
  {
    type: "error",
    name: "ERC721InvalidApprover",
    inputs: [
      {
        name: "approver",
        type: "address",
        internalType: "address",
      },
    ],
  },
  {
    type: "error",
    name: "ERC721InvalidOperator",
    inputs: [
      {
        name: "operator",
        type: "address",
        internalType: "address",
      },
    ],
  },
  {
    type: "error",
    name: "ERC721InvalidOwner",
    inputs: [
      {
        name: "owner",
        type: "address",
        internalType: "address",
      },
    ],
  },
  {
    type: "error",
    name: "ERC721InvalidReceiver",
    inputs: [
      {
        name: "receiver",
        type: "address",
        internalType: "address",
      },
    ],
  },
  {
    type: "error",
    name: "ERC721InvalidSender",
    inputs: [
      {
        name: "sender",
        type: "address",
        internalType: "address",
      },
    ],
  },
  {
    type: "error",
    name: "ERC721NonexistentToken",
    inputs: [
      {
        name: "tokenId",
        type: "uint256",
        internalType: "uint256",
      },
    ],
  },
  {
    type: "error",
    name: "ERC721OutOfBoundsIndex",
    inputs: [
      {
        name: "owner",
        type: "address",
        internalType: "address",
      },
      {
        name: "index",
        type: "uint256",
        internalType: "uint256",
      },
    ],
  },
  {
    type: "error",
    name: "InsufficientFee",
    inputs: [],
  },
  {
    type: "error",
    name: "InvalidBaseURI",
    inputs: [],
  },
  {
    type: "error",
    name: "InvalidFee",
    inputs: [],
  },
  {
    type: "error",
    name: "InvalidHookInterface",
    inputs: [],
  },
  {
    type: "error",
    name: "OwnableInvalidOwner",
    inputs: [
      {
        name: "owner",
        type: "address",
        internalType: "address",
      },
    ],
  },
  {
    type: "error",
    name: "OwnableUnauthorizedAccount",
    inputs: [
      {
        name: "account",
        type: "address",
        internalType: "address",
      },
    ],
  },
  {
    type: "error",
    name: "ReentrancyGuardReentrantCall",
    inputs: [],
  },
  {
    type: "error",
    name: "UnauthorizedCaller",
    inputs: [],
  },
  {
    type: "error",
    name: "ZeroAddress",
    inputs: [],
  },
] as const;
