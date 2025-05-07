// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ChannelManager} from "../ChannelManager.sol";
import {IHook} from "../interfaces/IHook.sol";
import {Hooks} from "../libraries/Hooks.sol";
import {Comments} from "../libraries/Comments.sol";
import {IChannelManager} from "../interfaces/IChannelManager.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

// Fee basic hook that does nothing
contract NoopHook is IHook {
    function supportsInterface(
        bytes4 interfaceId
    ) external pure returns (bool) {
        return interfaceId == type(IHook).interfaceId;
    }

    function beforeComment(
        Comments.CommentData calldata,
        address,
        bytes32
    ) external payable returns (bool) {
        return true;
    }

    function afterComment(
        Comments.CommentData calldata,
        address,
        bytes32
    ) external payable returns (bool) {
        return true;
    }

    function getHookPermissions()
        external
        pure
        override
        returns (Hooks.Permissions memory)
    {}

    function beforeInitialize(
        address channel
    ) external override returns (bool success) {}

    function afterInitialize(
        address channel
    ) external override returns (bool success) {}

    function beforeDeleteComment(
        Comments.CommentData calldata commentData,
        address caller,
        bytes32 commentId
    ) external payable override returns (bool success) {}

    function afterDeleteComment(
        Comments.CommentData calldata commentData,
        address caller,
        bytes32 commentId
    ) external override returns (bool success) {}
}
