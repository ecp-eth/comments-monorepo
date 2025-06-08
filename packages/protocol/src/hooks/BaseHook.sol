// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { IHook } from "../interfaces/IHook.sol";
import {
  IERC165
} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
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
        onInitialize: false,
        onCommentAdd: false,
        onCommentDelete: false,
        onCommentEdit: false,
        onChannelUpdate: false
      });
  }

  /// @inheritdoc IHook
  function onInitialize(
    address channel,
    Channels.Channel memory channelData,
    uint256 channelId
  ) external virtual returns (bool) {
    return _onInitialize(channel, channelData, channelId);
  }

  function _onInitialize(
    address,
    Channels.Channel memory,
    uint256
  ) internal virtual returns (bool) {
    revert HookNotImplemented();
  }

  /// @inheritdoc IHook
  function onCommentAdd(
    Comments.Comment calldata commentData,
    Comments.MetadataEntry[] calldata metadata,
    address msgSender,
    bytes32 commentId
  ) external payable virtual returns (Comments.MetadataEntry[] memory) {
    return _onCommentAdd(commentData, metadata, msgSender, commentId);
  }

  function _onCommentAdd(
    Comments.Comment calldata,
    Comments.MetadataEntry[] calldata,
    address,
    bytes32
  ) internal virtual returns (Comments.MetadataEntry[] memory) {
    revert HookNotImplemented();
  }

  /// @inheritdoc IHook
  function onCommentDelete(
    Comments.Comment calldata commentData,
    Comments.MetadataEntry[] calldata metadata,
    Comments.MetadataEntry[] calldata hookMetadata,
    address msgSender,
    bytes32 commentId
  ) external payable virtual returns (bool) {
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
    Comments.MetadataEntry[] calldata,
    Comments.MetadataEntry[] calldata,
    address,
    bytes32
  ) internal virtual returns (bool) {
    revert HookNotImplemented();
  }

  /// @inheritdoc IHook
  function onCommentEdit(
    Comments.Comment calldata commentData,
    Comments.MetadataEntry[] calldata metadata,
    address msgSender,
    bytes32 commentId
  ) external payable virtual returns (Comments.MetadataEntry[] memory) {
    return _onCommentEdit(commentData, metadata, msgSender, commentId);
  }

  function _onCommentEdit(
    Comments.Comment calldata,
    Comments.MetadataEntry[] calldata,
    address,
    bytes32
  ) internal virtual returns (Comments.MetadataEntry[] memory) {
    revert HookNotImplemented();
  }

  /// @inheritdoc IHook
  function onChannelUpdate(
    address channel,
    uint256 channelId,
    Channels.Channel calldata channelData
  ) external virtual returns (bool) {
    return _onChannelUpdate(channel, channelId, channelData);
  }

  function _onChannelUpdate(
    address,
    uint256,
    Channels.Channel calldata
  ) internal virtual returns (bool) {
    revert HookNotImplemented();
  }
}
