// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { ChannelManager } from "../ChannelManager.sol";
import { IHook } from "../interfaces/IHook.sol";
import { Hooks } from "../libraries/Hooks.sol";
import { Comments } from "../libraries/Comments.sol";
import { Channels } from "../libraries/Channels.sol";
import { Metadata } from "../libraries/Metadata.sol";
import { IChannelManager } from "../interfaces/IChannelManager.sol";
import {
  IERC721Receiver
} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

// Basic hook that does nothing
contract NoopHook is IHook {
  function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
    return interfaceId == type(IHook).interfaceId;
  }

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
        onChannelUpdate: false,
        onCommentHookDataUpdate: false
      });
  }

  function onCommentAdd(
    Comments.Comment calldata,
    Metadata.MetadataEntry[] calldata,
    address,
    bytes32
  ) external payable returns (Metadata.MetadataEntry[] memory) {
    return new Metadata.MetadataEntry[](0);
  }

  function onInitialize(
    address,
    Channels.Channel memory,
    uint256
  ) external pure override returns (bool) {
    return true;
  }

  function onCommentDelete(
    Comments.Comment calldata,
    Metadata.MetadataEntry[] calldata,
    Metadata.MetadataEntry[] calldata,
    address,
    bytes32
  ) external payable override returns (bool) {
    return true;
  }

  function onCommentEdit(
    Comments.Comment calldata,
    Metadata.MetadataEntry[] calldata,
    address,
    bytes32
  ) external payable override returns (Metadata.MetadataEntry[] memory) {
    return new Metadata.MetadataEntry[](0);
  }

  function onChannelUpdate(
    address,
    uint256,
    Channels.Channel calldata
  ) external pure override returns (bool) {
    return true;
  }

  function onCommentHookDataUpdate(
    Comments.Comment calldata,
    Metadata.MetadataEntry[] calldata,
    Metadata.MetadataEntry[] calldata,
    address,
    bytes32
  ) external pure override returns (Metadata.MetadataEntryOp[] memory) {
    return new Metadata.MetadataEntryOp[](0);
  }
}
