// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Test, console } from "forge-std/Test.sol";
import {
  IERC721Receiver
} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import { ChannelManager } from "../src/ChannelManager.sol";
import { CommentManager } from "../src/CommentManager.sol";
import { TestUtils, MockHook } from "../test/utils.sol";
import { Comments } from "../src/libraries/Comments.sol";
import { Hooks } from "../src/libraries/Hooks.sol";

/// @notice This script is used to debug the gas usage of the ChannelManager and CommentManager contracts.
/// @dev This script is not used in the protocol and should not be used in production.
contract DebugGasUsage is Test, IERC721Receiver {
  CommentManager public comments;
  ChannelManager public channelManager;
  MockHook public mockHook;

  address public owner;
  address public user1;
  address public user2;

  uint256 channelId;
  Comments.Comment commentData;
  Comments.CreateComment createCommentData;

  function setUp() public {
    owner = address(this);
    user1 = makeAddr("user1");
    user2 = makeAddr("user2");

    (comments, channelManager) = TestUtils.createContracts(owner);

    vm.deal(address(this), 10 ether);
  }

  function run() public {
    debugSetupChannel();
    debugConstructChannelManager();
    debugCreateChannel();
    debugUpdateChannel();
    debugPostComment();
  }

  function debugSetupChannel() public {
    mockHook = new MockHook();

    // Create channel with hook
    channelId = channelManager.createChannel{ value: 0.02 ether }(
      "Test Channel",
      "Description",
      "{}",
      address(mockHook)
    );
  }

  function debugConstructChannelManager() public {
    measureGas("constructChannelManager", runConstructChannelManager);
  }

  function runConstructChannelManager() internal {
    new ChannelManager(address(this));
  }

  function debugCreateChannel() public {
    measureGas("createChannel", runCreateChannel);
  }

  function runCreateChannel() internal {
    channelManager.createChannel{ value: 0.02 ether }(
      "Test Channel 2",
      "Description",
      "{}",
      address(0)
    );
  }

  function debugUpdateChannel() public {
    measureGas("updateChannel", runUpdateChannel);
  }

  function runUpdateChannel() internal {
    channelManager.updateChannel(
      channelId,
      "Test Channel 3",
      "Description",
      "{}"
    );
  }

  function debugPostComment() public {
    // Create comment data using direct construction
    createCommentData = Comments.CreateComment({
      content: "Test comment",
      metadata: "{}",
      targetUri: "",
      commentType: "comment",
      author: user1,
      app: user2,
      channelId: channelId,
      nonce: comments.getNonce(user1, user2),
      deadline: block.timestamp + 1 days,
      parentId: bytes32(0)
    });

    // Post comment directly as author
    vm.prank(user1);
    measureGas("postComment", runPostComment);
  }

  function runPostComment() internal {
    comments.postComment{ value: 0 }(createCommentData, "");
  }

  // Internal function to measure gas usage
  function measureGas(
    string memory operationName,
    function() internal fn
  ) internal {
    uint256 gasStart = gasleft();
    fn();
    uint256 gasUsed = gasStart - gasleft();
    console.log("Gas used for", operationName, ":", gasUsed);
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
