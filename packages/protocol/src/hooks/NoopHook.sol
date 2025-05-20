// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { ChannelManager } from "../ChannelManager.sol";
import { IHook } from "../interfaces/IHook.sol";
import { Hooks } from "../libraries/Hooks.sol";
import { Comments } from "../libraries/Comments.sol";
import { IChannelManager } from "../interfaces/IChannelManager.sol";
import {
  IERC721Receiver
} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {Channels} from "../libraries/Channels.sol";

// Fee basic hook that does nothing
contract NoopHook is IHook {
  function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
    return interfaceId == type(IHook).interfaceId;
  }

  function afterComment(
    Comments.Comment calldata,
    address,
    bytes32
  ) external payable returns (string memory hookData) {
    return "";
  }

  function getHookPermissions()
    external
    pure
    override
    returns (Hooks.Permissions memory)
  {}

    function afterInitialize(
        address channelManager,
        Channels.Channel memory channelData,
        uint256 channelId
    ) external override returns (bool success) {}

  function afterDeleteComment(
    Comments.Comment calldata commentData,
    address caller,
    bytes32 commentId
  ) external payable override returns (bool success) {}

  function afterEditComment(
    Comments.Comment calldata,
    address,
    bytes32
  ) external payable override returns (string memory commentHookData) {
    return "";
  }
}
