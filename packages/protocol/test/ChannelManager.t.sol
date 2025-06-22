// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Test } from "forge-std/Test.sol";
import { console } from "forge-std/console.sol";
import { ChannelManager } from "../src/ChannelManager.sol";
import { CommentManager } from "../src/CommentManager.sol";
import { IChannelManager } from "../src/interfaces/IChannelManager.sol";
import {
  IERC721Receiver
} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import { TestUtils, MockHook } from "./utils.sol";
import { Comments } from "../src/types/Comments.sol";
import { Hooks } from "../src/types/Hooks.sol";
import { Channels } from "../src/types/Channels.sol";
import { IHook } from "../src/interfaces/IHook.sol";
import { BaseHook } from "../src/hooks/BaseHook.sol";
import { Metadata } from "../src/types/Metadata.sol";

// Invalid hook that doesn't support the interface
contract InvalidHook {
  function supportsInterface(bytes4) external pure returns (bool) {
    return false;
  }
}

contract RejectChannelUpdateHook is BaseHook {
  function getHookPermissions()
    external
    pure
    override
    returns (Hooks.Permissions memory)
  {
    return
      Hooks.Permissions({
        onInitialize: false,
        onCommentAdd: false,
        onCommentDelete: false,
        onCommentEdit: false,
        onChannelUpdate: true,
        onCommentHookDataUpdate: false
      });
  }

  function _onChannelUpdate(
    address,
    uint256,
    Channels.Channel calldata,
    Metadata.MetadataEntry[] calldata
  ) internal pure override returns (bool) {
    revert("Rejected by hook");
  }
}

contract ChannelManagerTest is Test, IERC721Receiver {
  using TestUtils for string;

  CommentManager public comments;
  ChannelManager public channelManager;
  MockHook public mockHook;
  InvalidHook public invalidHook;

  address public owner;
  address public user1;
  address public user2;

  event ChannelCreated(
    uint256 indexed channelId,
    string name,
    string description,
    Metadata.MetadataEntry[] metadata,
    address hook,
    address owner
  );
  event ChannelUpdated(
    uint256 indexed channelId,
    string name,
    string description,
    Metadata.MetadataEntry[] metadata,
    address hook,
    address owner
  );
  event HookSet(uint256 indexed channelId, address indexed hook);
  event HookStatusUpdated(
    uint256 indexed channelId,
    address indexed hook,
    bool enabled
  );
  event HookRegistered(address indexed hook);
  event HookGlobalStatusUpdated(address indexed hook, bool enabled);

  function setUp() public {
    owner = address(this);
    user1 = makeAddr("user1");
    user2 = makeAddr("user2");

    mockHook = new MockHook();
    invalidHook = new InvalidHook();

    (comments, channelManager) = TestUtils.createContracts(owner);

    vm.deal(user1, 100 ether);
    vm.deal(user2, 100 ether);
  }

  function test_CreateChannel() public {
    string memory name = "Test Channel";
    string memory description = "Test Description";
    Metadata.MetadataEntry[] memory metadata = new Metadata.MetadataEntry[](0);

    uint256 initialBalance = address(channelManager).balance;
    uint256 channelId = channelManager.createChannel{ value: 0.02 ether }(
      name,
      description,
      metadata,
      address(0)
    );

    Channels.Channel memory channel = channelManager.getChannel(channelId);
    Metadata.MetadataEntry[] memory metadata2 = channelManager
      .getChannelMetadata(channelId);
    assertEq(channel.name, name);
    assertEq(channel.description, description);
    assertEq(metadata2.length, metadata.length);
    assertEq(address(channel.hook), address(0));
    assertEq(address(channelManager).balance - initialBalance, 0.02 ether);
  }

  function test_CreateChannelWithHook() public {
    string memory name = "Test Channel";
    string memory description = "Test Description";
    Metadata.MetadataEntry[] memory metadata = new Metadata.MetadataEntry[](0);

    uint256 initialBalance = address(channelManager).balance;
    uint256 channelId = channelManager.createChannel{ value: 0.02 ether }(
      name,
      description,
      metadata,
      address(mockHook)
    );

    Channels.Channel memory channel = channelManager.getChannel(channelId);
    assertEq(address(channel.hook), address(mockHook));
    assertEq(address(channelManager).balance - initialBalance, 0.02 ether);
  }

  function test_UpdateChannel() public {
    // First create a channel
    uint256 channelId = channelManager.createChannel{ value: 0.02 ether }(
      "Initial Name",
      "Initial Description",
      new Metadata.MetadataEntry[](0),
      address(0)
    );

    // Update the channel
    string memory newName = "Updated Name";
    string memory newDescription = "Updated Description";
    Metadata.MetadataEntryOp[]
      memory newMetadata = new Metadata.MetadataEntryOp[](1);
    newMetadata[0] = Metadata.MetadataEntryOp({
      operation: Metadata.MetadataOperation.SET,
      key: "string updated",
      value: abi.encode(true)
    });

    channelManager.updateChannel(
      channelId,
      newName,
      newDescription,
      newMetadata
    );

    Channels.Channel memory channel = channelManager.getChannel(channelId);

    Metadata.MetadataEntry[] memory metadata = channelManager
      .getChannelMetadata(channelId);
    assertEq(metadata.length, newMetadata.length);
    for (uint256 i = 0; i < newMetadata.length; i++) {
      assertEq(metadata[i].key, newMetadata[i].key);
    }

    assertEq(channel.name, newName);
    assertEq(channel.description, newDescription);
  }

  function test_SetHook() public {
    // Create channel without hook
    uint256 channelId = channelManager.createChannel{ value: 0.02 ether }(
      "Test Channel",
      "Description",
      new Metadata.MetadataEntry[](0),
      address(0)
    );

    // Set hook
    channelManager.setHook(channelId, address(mockHook));

    Channels.Channel memory channel = channelManager.getChannel(channelId);
    assertEq(address(channel.hook), address(mockHook));
  }

  function test_SetChannelMetadata_GasComparison() public {
    // Create a channel first
    uint256 channelId = channelManager.createChannel{ value: 0.02 ether }(
      "Test Channel",
      "Test Description",
      new Metadata.MetadataEntry[](0),
      address(0)
    );

    // Test data for both implementations
    bytes32 key1 = "string key1";
    bytes32 key2 = "string key2";
    bytes32 key3 = "string key3";
    bytes memory value1 = abi.encode("value1");
    bytes memory value2 = abi.encode("value2");
    bytes memory value3 = abi.encode("value3");

    // Test old implementation (full replacement)
    Metadata.MetadataEntryOp[]
      memory oldOperations = new Metadata.MetadataEntryOp[](3);
    oldOperations[0] = Metadata.MetadataEntryOp({
      operation: Metadata.MetadataOperation.SET,
      key: key1,
      value: value1
    });
    oldOperations[1] = Metadata.MetadataEntryOp({
      operation: Metadata.MetadataOperation.SET,
      key: key2,
      value: value2
    });
    oldOperations[2] = Metadata.MetadataEntryOp({
      operation: Metadata.MetadataOperation.SET,
      key: key3,
      value: value3
    });

    // Test new implementation (incremental updates)
    Metadata.MetadataEntryOp[]
      memory newOperations = new Metadata.MetadataEntryOp[](3);
    newOperations[0] = Metadata.MetadataEntryOp({
      operation: Metadata.MetadataOperation.SET,
      key: key1,
      value: value1
    });
    newOperations[1] = Metadata.MetadataEntryOp({
      operation: Metadata.MetadataOperation.SET,
      key: key2,
      value: value2
    });
    newOperations[2] = Metadata.MetadataEntryOp({
      operation: Metadata.MetadataOperation.SET,
      key: key3,
      value: value3
    });

    // Measure gas for old implementation
    uint256 oldGasStart = gasleft();
    channelManager.updateChannel(
      channelId,
      "Test Channel",
      "Test Description",
      oldOperations
    );
    uint256 oldGasUsed = oldGasStart - gasleft();

    // Measure gas for new implementation
    uint256 newGasStart = gasleft();
    channelManager.updateChannel(
      channelId,
      "Test Channel",
      "Test Description",
      newOperations
    );
    uint256 newGasUsed = newGasStart - gasleft();

    // Test partial updates
    Metadata.MetadataEntryOp[]
      memory partialOperations = new Metadata.MetadataEntryOp[](2);
    partialOperations[0] = Metadata.MetadataEntryOp({
      operation: Metadata.MetadataOperation.DELETE,
      key: key1,
      value: ""
    });
    partialOperations[1] = Metadata.MetadataEntryOp({
      operation: Metadata.MetadataOperation.SET,
      key: key2,
      value: abi.encode("updated value2")
    });

    // Measure gas for partial update
    uint256 partialGasStart = gasleft();
    channelManager.updateChannel(
      channelId,
      "Test Channel",
      "Test Description",
      partialOperations
    );
    uint256 partialGasUsed = partialGasStart - gasleft();

    // Log gas costs for comparison
    console.log("Gas used for full replacement (old):", oldGasUsed);
    console.log("Gas used for full replacement (new):", newGasUsed);
    console.log("Gas used for partial update (new):", partialGasUsed);
    console.log("Gas savings for full replacement:", oldGasUsed - newGasUsed);
    console.log(
      "Gas savings percentage:",
      ((oldGasUsed - newGasUsed) * 100) / oldGasUsed
    );
  }

  function test_SetChannelMetadata_DeleteAndUpdate() public {
    // Create a channel first
    uint256 channelId = channelManager.createChannel{ value: 0.02 ether }(
      "Test Channel",
      "Test Description",
      new Metadata.MetadataEntry[](0),
      address(0)
    );

    // First set some metadata
    Metadata.MetadataEntryOp[]
      memory setOperations = new Metadata.MetadataEntryOp[](2);
    setOperations[0] = Metadata.MetadataEntryOp({
      operation: Metadata.MetadataOperation.SET,
      key: "string key1",
      value: abi.encode("value1")
    });
    setOperations[1] = Metadata.MetadataEntryOp({
      operation: Metadata.MetadataOperation.SET,
      key: "string key2",
      value: abi.encode("value2")
    });

    channelManager.updateChannel(
      channelId,
      "Test Channel",
      "Test Description",
      setOperations
    );

    // Now delete one and update the other
    Metadata.MetadataEntryOp[]
      memory updateOperations = new Metadata.MetadataEntryOp[](2);
    updateOperations[0] = Metadata.MetadataEntryOp({
      operation: Metadata.MetadataOperation.DELETE,
      key: "string key1",
      value: ""
    });
    updateOperations[1] = Metadata.MetadataEntryOp({
      operation: Metadata.MetadataOperation.SET,
      key: "string key2",
      value: abi.encode("updated value2")
    });

    channelManager.updateChannel(
      channelId,
      "Test Channel",
      "Test Description",
      updateOperations
    );

    // Verify the results
    bytes memory value1 = channelManager.getChannelMetadataValue(
      channelId,
      "string key1"
    );
    bytes memory value2 = channelManager.getChannelMetadataValue(
      channelId,
      "string key2"
    );

    assertEq(value1.length, 0, "Key1 should be deleted");
    assertEq(
      string(abi.decode(value2, (string))),
      "updated value2",
      "Key2 should be updated"
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
