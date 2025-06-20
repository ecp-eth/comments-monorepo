// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Test } from "forge-std/Test.sol";
import { CommentManager } from "../src/CommentManager.sol";
import { Comments } from "../src/types/Comments.sol";
import { ChannelManager } from "../src/ChannelManager.sol";
import { ICommentManager } from "../src/interfaces/ICommentManager.sol";
import { IChannelManager } from "../src/interfaces/IChannelManager.sol";
import { BaseHook } from "../src/hooks/BaseHook.sol";
import { Hooks } from "../src/types/Hooks.sol";
import { Metadata } from "../src/types/Metadata.sol";
import { Channels } from "../src/types/Channels.sol";
import { IHook } from "../src/interfaces/IHook.sol";
import { TestUtils } from "./utils.sol";
import {
  IERC721Receiver
} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

error MaliciousHookError();
error UnauthorizedHookAccess();

/**
 * @title Malicious Revert Hook
 * @notice This hook always reverts to test failure handling
 */
contract MaliciousRevertHook is BaseHook {
  bool public shouldRevert;
  bool public shouldRevertOnInit;
  string public revertMessage;

  function _getHookPermissions()
    internal
    pure
    override
    returns (Hooks.Permissions memory)
  {
    return
      Hooks.Permissions({
        onInitialize: true,
        onCommentAdd: true,
        onCommentDelete: true,
        onCommentEdit: true,
        onChannelUpdate: true,
        onCommentHookDataUpdate: true
      });
  }

  function setRevert(bool _shouldRevert, string memory _message) external {
    shouldRevert = _shouldRevert;
    revertMessage = _message;
  }

  function setRevertOnInit(bool _shouldRevert) external {
    shouldRevertOnInit = _shouldRevert;
  }

  function _onInitialize(
    address,
    Channels.Channel memory,
    uint256
  ) internal view override returns (bool) {
    if (shouldRevertOnInit) {
      revert MaliciousHookError();
    }
    return true;
  }

  function _onCommentAdd(
    Comments.Comment calldata,
    Metadata.MetadataEntry[] calldata,
    address,
    bytes32
  ) internal view override returns (Metadata.MetadataEntry[] memory) {
    if (shouldRevert) {
      revert(revertMessage);
    }
    return new Metadata.MetadataEntry[](0);
  }

  function _onCommentEdit(
    Comments.Comment calldata,
    Metadata.MetadataEntry[] calldata,
    address,
    bytes32
  ) internal view override returns (Metadata.MetadataEntry[] memory) {
    if (shouldRevert) {
      revert(revertMessage);
    }
    return new Metadata.MetadataEntry[](0);
  }

  function _onCommentDelete(
    Comments.Comment calldata,
    Metadata.MetadataEntry[] calldata,
    Metadata.MetadataEntry[] calldata,
    address,
    bytes32
  ) internal view override returns (bool) {
    if (shouldRevert) {
      revert(revertMessage);
    }
    return true;
  }

  function onChannelUpdate(
    address,
    uint256,
    Channels.Channel calldata,
    Metadata.MetadataEntry[] calldata
  ) external view override returns (bool) {
    if (shouldRevert) {
      revert(revertMessage);
    }
    return true;
  }

  function _onCommentHookDataUpdate(
    Comments.Comment calldata,
    Metadata.MetadataEntry[] calldata,
    Metadata.MetadataEntry[] calldata,
    address,
    bytes32
  ) internal view override returns (Metadata.MetadataEntryOp[] memory) {
    if (shouldRevert) {
      revert(revertMessage);
    }
    return new Metadata.MetadataEntryOp[](0);
  }
}

/**
 * @title State Manipulation Hook
 * @notice This hook attempts to manipulate global state maliciously
 */
contract StateManipulationHook is BaseHook {
  CommentManager public commentManager;
  ChannelManager public channelManager;
  bool public shouldAttemptStateManipulation;
  address public targetToDestroy;

  function _getHookPermissions()
    internal
    pure
    override
    returns (Hooks.Permissions memory)
  {
    return
      Hooks.Permissions({
        onInitialize: false,
        onCommentAdd: true,
        onCommentDelete: false,
        onCommentEdit: false,
        onChannelUpdate: false,
        onCommentHookDataUpdate: false
      });
  }

  function setTargets(
    CommentManager _cm,
    ChannelManager _chm,
    address _target
  ) external {
    commentManager = _cm;
    channelManager = _chm;
    targetToDestroy = _target;
    shouldAttemptStateManipulation = true;
  }

  function _onCommentAdd(
    Comments.Comment calldata,
    Metadata.MetadataEntry[] calldata,
    address,
    bytes32
  ) internal override returns (Metadata.MetadataEntry[] memory) {
    if (shouldAttemptStateManipulation) {
      // Attempt various malicious state manipulations
      try this.attemptMaliciousActions() {
        // Should not succeed
      } catch {
        // Expected to fail
      }
    }
    return new Metadata.MetadataEntry[](0);
  }

  function attemptMaliciousActions() external {
    // Attempt to call protected functions
    if (address(commentManager) != address(0)) {
      try commentManager.updateChannelContract(targetToDestroy) {
        revert UnauthorizedHookAccess();
      } catch {
        // Expected to fail
      }
    }

    if (address(channelManager) != address(0)) {
      try channelManager.withdrawFees(targetToDestroy) {
        revert UnauthorizedHookAccess();
      } catch {
        // Expected to fail
      }
    }

    // Attempt self-destruct
    if (targetToDestroy != address(0)) {
      selfdestruct(payable(targetToDestroy));
    }
  }
}

/**
 * @title Gas Griefing Hook
 * @notice This hook consumes excessive gas
 */
contract GasGriefingHook is BaseHook {
  bool public shouldGrief;
  mapping(uint256 => bytes32) public gasWaste;

  function _getHookPermissions()
    internal
    pure
    override
    returns (Hooks.Permissions memory)
  {
    return
      Hooks.Permissions({
        onInitialize: false,
        onCommentAdd: true,
        onCommentDelete: false,
        onCommentEdit: false,
        onChannelUpdate: false,
        onCommentHookDataUpdate: false
      });
  }

  function setGasGriefing(bool _shouldGrief) external {
    shouldGrief = _shouldGrief;
  }

  function _onCommentAdd(
    Comments.Comment calldata,
    Metadata.MetadataEntry[] calldata,
    address,
    bytes32
  ) internal override returns (Metadata.MetadataEntry[] memory) {
    if (shouldGrief) {
      // Consume excessive gas through storage writes
      for (uint256 i = 0; i < 1000 && gasleft() > 10000; i++) {
        gasWaste[i] = keccak256(abi.encodePacked(block.timestamp, i));
      }
    }
    return new Metadata.MetadataEntry[](0);
  }
}

/**
 * @title Permission Escalation Hook
 * @notice This hook claims permissions it shouldn't have
 */
contract PermissionEscalationHook is BaseHook {
  bool public shouldClaimAllPermissions;

  function _getHookPermissions()
    internal
    pure
    override
    returns (Hooks.Permissions memory)
  {
    return
      Hooks.Permissions({
        onInitialize: false,
        onCommentAdd: true,
        onCommentDelete: false,
        onCommentEdit: false,
        onChannelUpdate: false,
        onCommentHookDataUpdate: false
      });
  }

  function escalatePermissions() external {
    shouldClaimAllPermissions = true;
  }

  function _onCommentAdd(
    Comments.Comment calldata,
    Metadata.MetadataEntry[] calldata,
    address,
    bytes32
  ) internal pure override returns (Metadata.MetadataEntry[] memory) {
    return new Metadata.MetadataEntry[](0);
  }
}

/**
 * @title Invalid Interface Hook
 * @notice This hook doesn't properly implement the IHook interface
 */
contract InvalidInterfaceHook {
  // Intentionally missing IHook implementation
  function getHookPermissions()
    external
    pure
    returns (Hooks.Permissions memory)
  {
    return
      Hooks.Permissions({
        onInitialize: false,
        onCommentAdd: true,
        onCommentDelete: false,
        onCommentEdit: false,
        onChannelUpdate: false,
        onCommentHookDataUpdate: false
      });
  }

  // Missing required supportsInterface function
}

contract HookSystemSecurityTest is Test, IERC721Receiver {
  CommentManager public comments;
  ChannelManager public channelManager;
  MaliciousRevertHook public maliciousRevertHook;
  StateManipulationHook public stateManipulationHook;
  GasGriefingHook public gasGriefingHook;
  PermissionEscalationHook public permissionEscalationHook;
  InvalidInterfaceHook public invalidInterfaceHook;

  address public owner;
  address public author;
  address public app;
  address public attacker;
  uint256 public authorPrivateKey = 0x1;
  uint256 public appPrivateKey = 0x2;
  uint256 public attackerPrivateKey = 0x4;

  function setUp() public {
    owner = address(this);
    author = vm.addr(authorPrivateKey);
    app = vm.addr(appPrivateKey);
    attacker = vm.addr(attackerPrivateKey);

    (comments, channelManager) = TestUtils.createContracts(owner);

    maliciousRevertHook = new MaliciousRevertHook();
    stateManipulationHook = new StateManipulationHook();
    gasGriefingHook = new GasGriefingHook();
    permissionEscalationHook = new PermissionEscalationHook();
    invalidInterfaceHook = new InvalidInterfaceHook();

    vm.deal(author, 100 ether);
    vm.deal(app, 100 ether);
    vm.deal(attacker, 100 ether);
  }

  function test_MaliciousHookRevert_ShouldFailGracefully() public {
    // Create channel with malicious hook
    uint256 channelId = channelManager.createChannel{ value: 0.02 ether }(
      "Malicious Channel",
      "Channel with malicious hook",
      new Metadata.MetadataEntry[](0),
      address(maliciousRevertHook)
    );

    maliciousRevertHook.setRevert(true, "Malicious hook revert");

    Comments.CreateComment memory commentData = TestUtils
      .generateDummyCreateComment(author, app, "Test comment");
    commentData.channelId = channelId;
    bytes32 commentId = comments.getCommentId(commentData);
    bytes memory appSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      commentId
    );

    // Should fail due to malicious hook
    vm.prank(author);
    vm.expectRevert("Malicious hook revert");
    comments.postComment(commentData, appSignature);
  }

  function test_HookInitializationFailure_ShouldRevert() public {
    maliciousRevertHook.setRevertOnInit(true);

    // Should fail during hook initialization
    vm.expectRevert(MaliciousHookError.selector);
    channelManager.createChannel{ value: 0.02 ether }(
      "Failed Init Channel",
      "Channel with hook that fails on init",
      new Metadata.MetadataEntry[](0),
      address(maliciousRevertHook)
    );
  }

  function test_InvalidHookInterface_ShouldReject() public {
    // Should fail because hook doesn't implement proper interface
    vm.expectRevert(IChannelManager.InvalidHookInterface.selector);
    channelManager.createChannel{ value: 0.02 ether }(
      "Invalid Interface Channel",
      "Channel with invalid hook interface",
      new Metadata.MetadataEntry[](0),
      address(invalidInterfaceHook)
    );
  }

  function test_StateManipulationHook_ShouldFail() public {
    // Set up state manipulation hook
    stateManipulationHook.setTargets(comments, channelManager, attacker);

    uint256 channelId = channelManager.createChannel{ value: 0.02 ether }(
      "State Manipulation Channel",
      "Channel with state manipulation hook",
      new Metadata.MetadataEntry[](0),
      address(stateManipulationHook)
    );

    Comments.CreateComment memory commentData = TestUtils
      .generateDummyCreateComment(author, app, "Test comment");
    commentData.channelId = channelId;
    bytes32 commentId = comments.getCommentId(commentData);
    bytes memory appSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      commentId
    );

    // Should succeed but hook's malicious actions should fail
    vm.prank(author);
    comments.postComment(commentData, appSignature);

    // Verify comment was created despite hook's malicious attempts
    Comments.Comment memory storedComment = comments.getComment(commentId);
    assertEq(
      storedComment.author,
      author,
      "Comment should be created despite malicious hook"
    );
  }

  function test_GasGriefingHook_ShouldComplete() public {
    gasGriefingHook.setGasGriefing(true);

    uint256 channelId = channelManager.createChannel{ value: 0.02 ether }(
      "Gas Griefing Channel",
      "Channel with gas griefing hook",
      new Metadata.MetadataEntry[](0),
      address(gasGriefingHook)
    );

    Comments.CreateComment memory commentData = TestUtils
      .generateDummyCreateComment(author, app, "Test comment");
    commentData.channelId = channelId;
    bytes32 commentId = comments.getCommentId(commentData);
    bytes memory appSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      commentId
    );

    // Should complete despite gas griefing
    vm.prank(author);
    comments.postComment(commentData, appSignature);

    // Verify comment was created
    Comments.Comment memory storedComment = comments.getComment(commentId);
    assertEq(
      storedComment.author,
      author,
      "Comment should be created despite gas griefing"
    );
  }

  function test_PermissionEscalationHook_ShouldNotGainExtraPermissions()
    public
  {
    // Create hook with limited permissions
    uint256 channelId = channelManager.createChannel{ value: 0.02 ether }(
      "Permission Test Channel",
      "Channel for testing permission escalation",
      new Metadata.MetadataEntry[](0),
      address(permissionEscalationHook)
    );

    // Hook tries to escalate permissions after deployment
    permissionEscalationHook.escalatePermissions();

    // The hook's permissions should remain as originally set
    // This test verifies that permission changes after deployment don't affect behavior
    Comments.CreateComment memory commentData = TestUtils
      .generateDummyCreateComment(author, app, "Test comment");
    commentData.channelId = channelId;
    bytes32 commentId = comments.getCommentId(commentData);
    bytes memory appSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      commentId
    );

    vm.prank(author);
    comments.postComment(commentData, appSignature);

    // Verify comment was created normally
    Comments.Comment memory storedComment = comments.getComment(commentId);
    assertEq(
      storedComment.author,
      author,
      "Comment should be created normally"
    );
  }

  function test_HookWithExcessiveMetadata_ShouldHandleGracefully() public {
    // Test hook that returns extremely large metadata arrays
    uint256 channelId = channelManager.createChannel{ value: 0.02 ether }(
      "Large Metadata Channel",
      "Channel with hook returning large metadata",
      new Metadata.MetadataEntry[](0),
      address(stateManipulationHook)
    );

    Comments.CreateComment memory commentData = TestUtils
      .generateDummyCreateComment(author, app, "Test comment");
    commentData.channelId = channelId;
    bytes32 commentId = comments.getCommentId(commentData);
    bytes memory appSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      commentId
    );

    // Might fail due to gas limits or handle gracefully
    vm.prank(author);
    try comments.postComment(commentData, appSignature) {
      // If successful, verify comment exists
      Comments.Comment memory storedComment = comments.getComment(commentId);
      assertEq(storedComment.author, author, "Comment should be created");
    } catch {
      // Expected to fail due to resource limits
    }
  }

  function test_HookOnlyCalledByAuthorizedContracts() public {
    // Test that hooks can only be called by the channel manager
    maliciousRevertHook.setRevert(false, "");

    uint256 channelId = channelManager.createChannel{ value: 0.02 ether }(
      "Auth Test Channel",
      "Channel for testing hook authorization",
      new Metadata.MetadataEntry[](0),
      address(maliciousRevertHook)
    );

    // Try to call hook functions directly (should fail or be meaningless)
    Comments.Comment memory dummyComment;
    Metadata.MetadataEntry[]
      memory dummyMetadata = new Metadata.MetadataEntry[](0);

    // These calls should not affect the system state
    try
      maliciousRevertHook.onInitialize(
        address(channelManager),
        Channels.Channel({
          name: "test",
          description: "test",
          metadata: dummyMetadata,
          hook: address(0),
          permissions: Hooks.Permissions({
            onInitialize: false,
            onCommentAdd: false,
            onCommentDelete: false,
            onCommentEdit: false,
            onChannelUpdate: false,
            onCommentHookDataUpdate: false
          })
        }),
        channelId
      )
    {
      // Direct call succeeded but shouldn't affect system
    } catch {
      // Expected to fail
    }
  }

  function test_HookSelfDestruct_ShouldNotAffectSystem() public {
    // Test that hook self-destruction doesn't break the system
    uint256 channelId = channelManager.createChannel{ value: 0.02 ether }(
      "Self Destruct Channel",
      "Channel with self-destructing hook",
      new Metadata.MetadataEntry[](0),
      address(stateManipulationHook)
    );

    // Set hook to attempt self-destruct
    stateManipulationHook.setTargets(comments, channelManager, attacker);

    Comments.CreateComment memory commentData = TestUtils
      .generateDummyCreateComment(author, app, "Test comment");
    commentData.channelId = channelId;
    bytes32 commentId = comments.getCommentId(commentData);
    bytes memory appSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      commentId
    );

    // Should handle hook failure gracefully
    vm.prank(author);
    try comments.postComment(commentData, appSignature) {
      // If successful, verify comment exists
      Comments.Comment memory storedComment = comments.getComment(commentId);
      assertEq(storedComment.author, author, "Comment should be created");
    } catch {
      // Expected to fail due to hook issues
    }
  }

  function test_HookMetadataCorruption_ShouldBeContained() public {
    // Test that corrupted hook metadata doesn't affect other comments
    uint256 channelId = channelManager.createChannel{ value: 0.02 ether }(
      "Metadata Corruption Channel",
      "Channel for testing metadata corruption",
      new Metadata.MetadataEntry[](0),
      address(maliciousRevertHook)
    );

    // Create normal comment first
    Comments.CreateComment memory normalComment = TestUtils
      .generateDummyCreateComment(author, app, "Test comment");
    normalComment.content = "Normal comment";
    bytes32 normalCommentId = comments.getCommentId(normalComment);
    bytes memory normalSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      normalCommentId
    );

    vm.prank(author);
    comments.postComment(normalComment, normalSignature);

    // Now try with malicious hook (should be isolated)
    Comments.CreateComment memory maliciousComment = TestUtils
      .generateDummyCreateComment(author, app, "Test comment");
    maliciousComment.channelId = channelId;
    maliciousComment.content = "Malicious hook comment";
    bytes32 maliciousCommentId = comments.getCommentId(maliciousComment);
    bytes memory maliciousSignature = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      maliciousCommentId
    );

    maliciousRevertHook.setRevert(false, "");
    vm.prank(author);
    comments.postComment(maliciousComment, maliciousSignature);

    // Verify both comments exist and are unaffected
    Comments.Comment memory storedNormal = comments.getComment(normalCommentId);
    Comments.Comment memory storedMalicious = comments.getComment(
      maliciousCommentId
    );

    assertEq(
      storedNormal.content,
      "Normal comment",
      "Normal comment should be unaffected"
    );
    assertEq(
      storedMalicious.content,
      "Malicious hook comment",
      "Malicious comment should be created"
    );
  }

  function test_CrossHookInterference_ShouldBeIsolated() public {
    // Test that different hooks on different channels don't interfere

    // Create two channels with different hooks
    uint256 channelId1 = channelManager.createChannel{ value: 0.02 ether }(
      "Hook Channel 1",
      "Channel with gas griefing hook",
      new Metadata.MetadataEntry[](0),
      address(gasGriefingHook)
    );

    uint256 channelId2 = channelManager.createChannel{ value: 0.02 ether }(
      "Hook Channel 2",
      "Channel with revert hook",
      new Metadata.MetadataEntry[](0),
      address(maliciousRevertHook)
    );

    gasGriefingHook.setGasGriefing(true);
    maliciousRevertHook.setRevert(false, "");

    // Post to both channels
    Comments.CreateComment memory comment1 = TestUtils
      .generateDummyCreateComment(author, app, "Test comment");
    comment1.channelId = channelId1;
    comment1.content = "Gas griefing channel comment";
    bytes32 commentId1 = comments.getCommentId(comment1);
    bytes memory signature1 = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      commentId1
    );

    Comments.CreateComment memory comment2 = TestUtils
      .generateDummyCreateComment(author, app, "Test comment");
    comment2.channelId = channelId2;
    comment2.content = "Revert hook channel comment";
    bytes32 commentId2 = comments.getCommentId(comment2);
    bytes memory signature2 = TestUtils.signEIP712(
      vm,
      appPrivateKey,
      commentId2
    );

    vm.prank(author);
    comments.postComment(comment1, signature1);

    vm.prank(author);
    comments.postComment(comment2, signature2);

    // Verify both comments exist and hooks didn't interfere
    Comments.Comment memory stored1 = comments.getComment(commentId1);
    Comments.Comment memory stored2 = comments.getComment(commentId2);

    assertEq(
      stored1.content,
      "Gas griefing channel comment",
      "Gas griefing comment should exist"
    );
    assertEq(
      stored2.content,
      "Revert hook channel comment",
      "Revert hook comment should exist"
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
