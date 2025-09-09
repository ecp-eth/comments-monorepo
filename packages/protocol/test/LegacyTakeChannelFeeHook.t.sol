// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {
  IERC165
} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {
  ReentrancyGuard
} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { ERC165 } from "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import { IHook } from "../src/interfaces/IHook.sol";
import { Hooks } from "../src/types/Hooks.sol";
import { Comments } from "../src/types/Comments.sol";
import { Metadata } from "../src/types/Metadata.sol";
import { Channels } from "../src/types/Channels.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title LegacyBaseHook
 * @notice Legacy abstract base contract for all hook implementations, this is used for testing purposes
 * @dev Provides default implementations that throw HookNotImplemented if not overridden
 */
abstract contract LegacyBaseHook is ERC165, IHook {
  /// @notice Error thrown when a hook function is not implemented
  error HookNotImplemented();

  /**
   * @notice Checks if the contract implements the specified interface
   * @param interfaceId The interface identifier to check
   * @return True if the contract implements the interface
   */
  function supportsInterface(
    bytes4 interfaceId
  ) public view virtual override(ERC165, IERC165) returns (bool) {
    return
      interfaceId == type(IHook).interfaceId ||
      super.supportsInterface(interfaceId);
  }

  /// @inheritdoc IHook
  function getHookPermissions()
    external
    pure
    virtual
    returns (Hooks.Permissions memory)
  {
    return _getHookPermissions();
  }

  function _getHookPermissions()
    internal
    pure
    virtual
    returns (Hooks.Permissions memory)
  {
    return
      Hooks.Permissions({
        onInitialize: false,
        onCommentAdd: false,
        onCommentDelete: false,
        onCommentEdit: false,
        onChannelUpdate: false,
        onCommentHookDataUpdate: false
      });
  }

  /// @inheritdoc IHook
  function onInitialize(
    address channelManager,
    Channels.Channel memory channelData,
    uint256 channelId,
    Metadata.MetadataEntry[] calldata metadata
  ) external virtual returns (bool) {
    return _onInitialize(channelManager, channelData, channelId, metadata);
  }

  function _onInitialize(
    address,
    Channels.Channel memory,
    uint256,
    Metadata.MetadataEntry[] calldata
  ) internal virtual returns (bool) {
    revert HookNotImplemented();
  }

  /// @inheritdoc IHook
  function onCommentAdd(
    Comments.Comment calldata commentData,
    Metadata.MetadataEntry[] calldata metadata,
    address msgSender,
    bytes32 commentId
  ) external payable virtual returns (Metadata.MetadataEntry[] memory) {
    return _onCommentAdd(commentData, metadata, msgSender, commentId);
  }

  function _onCommentAdd(
    Comments.Comment calldata,
    Metadata.MetadataEntry[] calldata,
    address,
    bytes32
  ) internal virtual returns (Metadata.MetadataEntry[] memory) {
    revert HookNotImplemented();
  }

  /// @inheritdoc IHook
  function onCommentDelete(
    Comments.Comment calldata commentData,
    Metadata.MetadataEntry[] calldata metadata,
    Metadata.MetadataEntry[] calldata hookMetadata,
    address msgSender,
    bytes32 commentId
  ) external virtual returns (bool) {
    return
      _onCommentDelete(
        commentData,
        metadata,
        hookMetadata,
        msgSender,
        commentId
      );
  }

  function _onCommentDelete(
    Comments.Comment calldata,
    Metadata.MetadataEntry[] calldata,
    Metadata.MetadataEntry[] calldata,
    address,
    bytes32
  ) internal virtual returns (bool) {
    revert HookNotImplemented();
  }

  /// @inheritdoc IHook
  function onCommentEdit(
    Comments.Comment calldata commentData,
    Metadata.MetadataEntry[] calldata metadata,
    address msgSender,
    bytes32 commentId
  ) external payable virtual returns (Metadata.MetadataEntry[] memory) {
    return _onCommentEdit(commentData, metadata, msgSender, commentId);
  }

  function _onCommentEdit(
    Comments.Comment calldata,
    Metadata.MetadataEntry[] calldata,
    address,
    bytes32
  ) internal virtual returns (Metadata.MetadataEntry[] memory) {
    revert HookNotImplemented();
  }

  /// @inheritdoc IHook
  function onChannelUpdate(
    address channel,
    uint256 channelId,
    Channels.Channel calldata channelData,
    Metadata.MetadataEntry[] calldata metadata
  ) external virtual returns (bool) {
    return _onChannelUpdate(channel, channelId, channelData, metadata);
  }

  function _onChannelUpdate(
    address,
    uint256,
    Channels.Channel calldata,
    Metadata.MetadataEntry[] calldata
  ) internal virtual returns (bool) {
    revert HookNotImplemented();
  }

  /// @inheritdoc IHook
  function onCommentHookDataUpdate(
    Comments.Comment calldata commentData,
    Metadata.MetadataEntry[] calldata metadata,
    Metadata.MetadataEntry[] calldata hookMetadata,
    address msgSender,
    bytes32 commentId
  ) external virtual returns (Metadata.MetadataEntryOp[] memory) {
    return
      _onCommentHookDataUpdate(
        commentData,
        metadata,
        hookMetadata,
        msgSender,
        commentId
      );
  }

  function _onCommentHookDataUpdate(
    Comments.Comment calldata,
    Metadata.MetadataEntry[] calldata,
    Metadata.MetadataEntry[] calldata,
    address,
    bytes32
  ) internal virtual returns (Metadata.MetadataEntryOp[] memory) {
    revert HookNotImplemented();
  }
}

/**
 * @title LegacyTakeChannelFeeHook
 * @notice Requires users to pay a fee to post comments, this is used for testing purposes
 * @dev Fees are accumulated in the contract and can be withdrawn in batches
 */
contract LegacyTakeChannelFeeHook is LegacyBaseHook, Ownable, ReentrancyGuard {
  event FeePaid(address indexed payer, uint256 amount);
  event TreasuryUpdated(address indexed newTreasury);
  event CommentFeeUpdated(uint256 newFee);

  address public treasury;
  uint256 public commentFee;

  constructor(uint256 _commentFee, address _treasury) Ownable(msg.sender) {
    _setTreasury(_treasury);
    commentFee = _commentFee;
  }

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
        onCommentEdit: false,
        onCommentDelete: false,
        onChannelUpdate: false,
        onCommentHookDataUpdate: false
      });
  }

  function _onCommentAdd(
    Comments.Comment calldata commentData,
    Metadata.MetadataEntry[] calldata,
    address msgSender,
    bytes32
  ) internal override nonReentrant returns (Metadata.MetadataEntry[] memory) {
    // Anyone can react to a comment
    if (commentData.commentType == Comments.COMMENT_TYPE_REACTION) {
      return new Metadata.MetadataEntry[](0);
    }

    // Anyone can reply to a comment
    if (commentData.parentId != bytes32(0)) {
      return new Metadata.MetadataEntry[](0);
    }

    // Root comments require a fee
    require(msg.value >= commentFee, "FeeHook: insufficient fee");

    // Refund excess payment to user
    uint256 refund = msg.value - commentFee;
    if (refund > 0) {
      _transfer(msgSender, refund);
    }

    emit FeePaid(msgSender, commentFee);

    return new Metadata.MetadataEntry[](0);
  }

  /**
   * @notice Withdraw all accumulated fees to treasury
   * @dev Can only be called by owner (admin)
   */
  function claimFees() external onlyOwner nonReentrant {
    uint256 balance = address(this).balance;
    require(balance > 0, "FeeHook: no fees to claim");

    _transfer(treasury, balance);
  }

  /**
   * @notice Get the amount of fees available for withdrawal
   */
  function fees() external view returns (uint256) {
    return address(this).balance;
  }

  function setTreasury(address _treasury) external onlyOwner {
    _setTreasury(_treasury);
  }

  function setFee(uint256 _fee) external onlyOwner {
    commentFee = _fee;
    emit CommentFeeUpdated(_fee);
  }

  function _setTreasury(address _treasury) internal {
    require(_treasury != address(0), "FeeHook: invalid treasury");
    treasury = _treasury;
    emit TreasuryUpdated(_treasury);
  }

  function _transfer(address to, uint256 amount) internal {
    (bool success, ) = payable(to).call{ value: amount }("");
    require(success, "FeeHook: transfer failed");
  }

  receive() external payable {}
}
