// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { IHook } from "../interfaces/IHook.sol";
import { IERC165 } from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import { ERC165 } from "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import { Hooks } from "../libraries/Hooks.sol";
import { Comments } from "../libraries/Comments.sol";
import { Channels } from "../libraries/Channels.sol";

/**
 * @title BaseHook
 * @notice Abstract base contract for all hook implementations
 * @dev Provides default implementations that throw HookNotImplemented if not overridden
 */
abstract contract BaseHook is IHook, ERC165 {
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
        onInitialized: false,
        onCommentAdded: false,
        onCommentDeleted: false,
        onCommentEdited: false,
        onChannelUpdated: false
      });
  }

  /// @inheritdoc IHook
  function onInitialized(
    address channel,
    Channels.Channel memory channelData,
    uint256 channelId
  ) external virtual returns (bool) {
    return _onInitialized(channel, channelData, channelId);
  }

  function _onInitialized(
    address,
    Channels.Channel memory,
    uint256
  ) internal virtual returns (bool) {
    revert HookNotImplemented();
  }

  /// @inheritdoc IHook
  function onCommentAdded(
    Comments.Comment calldata commentData,
    address caller,
    bytes32 commentId
  ) external payable virtual returns (string memory) {
    return _onCommentAdded(commentData, caller, commentId);
  }

  function _onCommentAdded(
    Comments.Comment calldata,
    address,
    bytes32
  ) internal virtual returns (string memory) {
    revert HookNotImplemented();
  }

  /// @inheritdoc IHook
  function onCommentDeleted(
    Comments.Comment calldata commentData,
    address caller,
    bytes32 commentId
  ) external payable virtual returns (bool) {
    return _onCommentDeleted(commentData, caller, commentId);
  }

  function _onCommentDeleted(
    Comments.Comment calldata,
    address,
    bytes32
  ) internal virtual returns (bool) {
    revert HookNotImplemented();
  }

  /// @inheritdoc IHook
  function onCommentEdited(
    Comments.Comment calldata commentData,
    address caller,
    bytes32 commentId
  ) external payable virtual returns (string memory) {
    return _onCommentEdited(commentData, caller, commentId);
  }

  function _onCommentEdited(
    Comments.Comment calldata,
    address,
    bytes32
  ) internal virtual returns (string memory) {
    revert HookNotImplemented();
  }

  /// @inheritdoc IHook
  function onChannelUpdated(
    address channel,
    uint256 channelId,
    Channels.Channel calldata channelData
  ) external virtual returns (bool) {
    return _onChannelUpdated(channel, channelId, channelData);
  }

  function _onChannelUpdated(
    address,
    uint256,
    Channels.Channel calldata
  ) internal virtual returns (bool) {
    revert HookNotImplemented();
  }
}
