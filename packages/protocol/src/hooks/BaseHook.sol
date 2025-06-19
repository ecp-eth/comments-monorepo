// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { IHook } from "../interfaces/IHook.sol";
import {
  IERC165
} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import { ERC165 } from "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import { Hooks } from "../types/Hooks.sol";
import { Comments } from "../types/Comments.sol";
import { Channels } from "../types/Channels.sol";
import { Metadata } from "../types/Metadata.sol";

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
        onChannelUpdate: false,
        onCommentHookDataUpdate: false
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
