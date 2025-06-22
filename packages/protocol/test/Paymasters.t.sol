// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { VmSafe } from "forge-std/Vm.sol";
import { Test, console } from "forge-std/Test.sol";
import {
  IEntryPoint
} from "@account-abstraction/contracts/interfaces/IEntryPoint.sol";
import { EntryPoint } from "@account-abstraction/contracts/core/EntryPoint.sol";
import {
  BaseAccount
} from "@account-abstraction/contracts/core/BaseAccount.sol";
import {
  SimpleAccount
} from "@account-abstraction/contracts/accounts/SimpleAccount.sol";
import {
  SimpleAccountFactory
} from "@account-abstraction/contracts/accounts/SimpleAccountFactory.sol";
import {
  IAccount
} from "@account-abstraction/contracts/interfaces/IAccount.sol";
import "@account-abstraction/contracts/core/UserOperationLib.sol";
import "@account-abstraction/contracts/core/Helpers.sol";
import {
  BasePaymaster
} from "@account-abstraction/contracts/core/BasePaymaster.sol";
import { ChannelManager } from "../src/ChannelManager.sol";
import { CommentManager } from "../src/CommentManager.sol";
import { IHook } from "../src/interfaces/IHook.sol";
import { IChannelManager } from "../src/interfaces/IChannelManager.sol";
import {
  IERC721Receiver
} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import { TestUtils, MockHook } from "./utils.sol";
import { Metadata } from "../src/types/Metadata.sol";

/**
 * test paymaster, that pays for everything, without any check.
 */
contract TestPaymasterAcceptAll is BasePaymaster {
  constructor(IEntryPoint _entryPoint) BasePaymaster(_entryPoint) {
    // to support "deterministic address" factory
    // solhint-disable avoid-tx-origin
    if (tx.origin != msg.sender) {
      _transferOwnership(tx.origin);
    }
  }

  function _validatePaymasterUserOp(
    PackedUserOperation calldata userOp,
    bytes32 userOpHash,
    uint256 maxCost
  )
    internal
    view
    virtual
    override
    returns (bytes memory context, uint256 validationData)
  {
    (userOp, userOpHash, maxCost);
    return ("", SIG_VALIDATION_SUCCESS);
  }
}

contract TestAccount is IAccount {
  IEntryPoint private ep;

  constructor(IEntryPoint _ep) payable {
    ep = _ep;
  }

  function validateUserOp(
    PackedUserOperation calldata,
    bytes32,
    uint256 missingAccountFunds
  ) external override returns (uint256 validationData) {
    ep.depositTo{ value: missingAccountFunds }(address(this));
    return SIG_VALIDATION_SUCCESS;
  }
}

contract PaymastersTest is Test, IERC721Receiver {
  using UserOperationLib for PackedUserOperation;
  using TestUtils for string;

  EntryPoint public entryPointContract;
  TestPaymasterAcceptAll public paymaster;
  CommentManager public comments;
  ChannelManager public channelManager;
  MockHook public mockHook;

  address public owner;
  address public user1;
  uint256 public user1PrivateKey;
  address public beneficiary;
  SimpleAccount public user1Account;

  function setUp() public {
    owner = address(this);
    (user1, user1PrivateKey) = makeAddrAndKey("user1");
    beneficiary = makeAddr("beneficiary");

    // Fund the test contract itself first
    vm.deal(address(this), 100 ether);

    // Create and fund users
    vm.deal(user1, 100 ether);

    // Deploy core contracts
    entryPointContract = new EntryPoint();
    paymaster = new TestPaymasterAcceptAll(entryPointContract);

    vm.startPrank(address(entryPointContract.senderCreator()));
    user1Account = new SimpleAccountFactory(entryPointContract).createAccount(
      user1,
      0
    );
    vm.stopPrank();

    mockHook = new MockHook();

    // Deploy and setup protocol contracts
    (comments, channelManager) = TestUtils.createContracts(owner);

    // Fund the paymaster first
    paymaster.deposit{ value: 1 ether }();
  }

  function test_CreateChannelThroughPaymaster() public {
    string memory name = "Test Channel";
    string memory description = "Test Description";
    Metadata.MetadataEntry[] memory metadata = new Metadata.MetadataEntry[](0);
    bytes memory innerCallData = abi.encodeWithSignature(
      "createChannel(string,string,(bytes32,bytes)[],address)",
      name,
      description,
      metadata,
      address(0)
    );

    uint256 initialPaymasterBalance = entryPointContract.balanceOf(
      address(paymaster)
    );

    vm.deal(address(user1Account), 0.02 ether);

    // Create the calldata for channel creation
    bytes memory callData = abi.encodeWithSelector(
      BaseAccount.execute.selector,
      address(channelManager),
      0.02 ether,
      innerCallData
    );

    // Create the user operation
    PackedUserOperation memory userOp = PackedUserOperation({
      sender: address(user1Account),
      nonce: entryPointContract.getNonce(address(user1Account), 0),
      initCode: "",
      callData: callData,
      accountGasLimits: bytes32(
        abi.encodePacked(
          uint128(200_000), // verificationGasLimit
          uint128(240_000) // callGasLimit
        )
      ),
      preVerificationGas: 200_00,
      gasFees: bytes32(
        abi.encodePacked(
          uint128(2 gwei), // maxPriorityFeePerGas
          uint128(20 gwei) // maxFeePerGas
        )
      ),
      paymasterAndData: abi.encodePacked(
        address(paymaster),
        uint128(200_000), // verificationGasLimit
        uint128(210_000), // postOpGasLimit
        bytes("") // paymasterData
      ),
      signature: bytes("")
    });

    bytes32 userOpHash = entryPointContract.getUserOpHash(userOp);
    (uint8 v, bytes32 r, bytes32 s) = vm.sign(user1PrivateKey, userOpHash);
    userOp.signature = abi.encodePacked(r, s, v);

    vm.recordLogs();

    // Pack the user operation into an array
    PackedUserOperation[] memory ops = new PackedUserOperation[](1);
    ops[0] = userOp;

    // Execute the user operation
    entryPointContract.handleOps(ops, payable(beneficiary));

    VmSafe.Log[] memory logs = vm.getRecordedLogs();

    uint256 foundCreatedChannelId = 0;

    for (uint256 i = 0; i < logs.length; i++) {
      VmSafe.Log memory logEntry = logs[i];

      if (logEntry.topics.length == 0) {
        continue;
      }

      if (
        logEntry.topics[0] ==
        keccak256(
          "ChannelCreated(uint256,string,string,(bytes32,bytes)[],address,address)"
        )
      ) {
        // The channel ID is in the first topic after the event signature
        foundCreatedChannelId = uint256(logEntry.topics[1]);
        break;
      }
    }

    assertTrue(
      foundCreatedChannelId != 0,
      "Channel creation failed - no channel ID found"
    );
    assertLt(
      entryPointContract.balanceOf(address(paymaster)),
      initialPaymasterBalance
    );

    assertEq(
      channelManager.ownerOf(foundCreatedChannelId),
      address(user1Account)
    );
  }

  function onERC721Received(
    address,
    address,
    uint256,
    bytes calldata
  ) external pure returns (bytes4) {
    return IERC721Receiver.onERC721Received.selector;
  }
}
