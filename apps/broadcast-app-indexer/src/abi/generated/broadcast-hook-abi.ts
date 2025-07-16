/**
 * ABI of the BroadcastHook contract.
 */
export const BroadcastHookABI = [
  {
    type: "constructor",
    inputs: [
      {
        name: "_channelManager",
        type: "address",
        internalType: "address",
      },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "receive",
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "channelManager",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "contract ChannelManager",
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
    ],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "getHookPermissions",
    inputs: [],
    outputs: [
      {
        name: "",
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
    stateMutability: "pure",
  },
  {
    type: "function",
    name: "isWhitelisted",
    inputs: [
      {
        name: "user",
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
    name: "onChannelUpdate",
    inputs: [
      {
        name: "channel",
        type: "address",
        internalType: "address",
      },
      {
        name: "channelId",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "channelData",
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
        type: "bool",
        internalType: "bool",
      },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "onCommentAdd",
    inputs: [
      {
        name: "commentData",
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
            type: "uint88",
            internalType: "uint88",
          },
          {
            name: "authMethod",
            type: "uint8",
            internalType: "enum Comments.AuthorAuthMethod",
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
        name: "msgSender",
        type: "address",
        internalType: "address",
      },
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
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "onCommentDelete",
    inputs: [
      {
        name: "commentData",
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
            type: "uint88",
            internalType: "uint88",
          },
          {
            name: "authMethod",
            type: "uint8",
            internalType: "enum Comments.AuthorAuthMethod",
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
        name: "hookMetadata",
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
        name: "msgSender",
        type: "address",
        internalType: "address",
      },
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
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "onCommentEdit",
    inputs: [
      {
        name: "commentData",
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
            type: "uint88",
            internalType: "uint88",
          },
          {
            name: "authMethod",
            type: "uint8",
            internalType: "enum Comments.AuthorAuthMethod",
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
        name: "msgSender",
        type: "address",
        internalType: "address",
      },
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
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "onCommentHookDataUpdate",
    inputs: [
      {
        name: "commentData",
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
            type: "uint88",
            internalType: "uint88",
          },
          {
            name: "authMethod",
            type: "uint8",
            internalType: "enum Comments.AuthorAuthMethod",
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
        name: "hookMetadata",
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
        name: "msgSender",
        type: "address",
        internalType: "address",
      },
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
        internalType: "struct Metadata.MetadataEntryOp[]",
        components: [
          {
            name: "operation",
            type: "uint8",
            internalType: "enum Metadata.MetadataOperation",
          },
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
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "onERC721Received",
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
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "",
        type: "bytes",
        internalType: "bytes",
      },
    ],
    outputs: [
      {
        name: "",
        type: "bytes4",
        internalType: "bytes4",
      },
    ],
    stateMutability: "pure",
  },
  {
    type: "function",
    name: "onInitialize",
    inputs: [
      {
        name: "channelManager",
        type: "address",
        internalType: "address",
      },
      {
        name: "channelData",
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
    outputs: [
      {
        name: "",
        type: "bool",
        internalType: "bool",
      },
    ],
    stateMutability: "nonpayable",
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
    name: "renounceOwnership",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "setWhitelistMode",
    inputs: [
      {
        name: "enabled",
        type: "bool",
        internalType: "bool",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "setWhitelistStatus",
    inputs: [
      {
        name: "user",
        type: "address",
        internalType: "address",
      },
      {
        name: "status",
        type: "bool",
        internalType: "bool",
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
    name: "whitelistModeEnabled",
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
        name: "creator",
        type: "address",
        indexed: true,
        internalType: "address",
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
    name: "WhitelistModeSet",
    inputs: [
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
    name: "WhitelistStatusChanged",
    inputs: [
      {
        name: "user",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "isWhitelisted",
        type: "bool",
        indexed: false,
        internalType: "bool",
      },
    ],
    anonymous: false,
  },
  {
    type: "error",
    name: "HookNotImplemented",
    inputs: [],
  },
  {
    type: "error",
    name: "InsufficientFunds",
    inputs: [],
  },
  {
    type: "error",
    name: "InvalidAddress",
    inputs: [],
  },
  {
    type: "error",
    name: "NotWhitelisted",
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
    name: "UnauthorizedCommenter",
    inputs: [],
  },
] as const;
