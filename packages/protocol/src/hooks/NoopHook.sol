// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ChannelManager} from "../ChannelManager.sol";
import {CommentsV1} from "../CommentsV1.sol";
import {IHook} from "../interfaces/IHook.sol";
import {ICommentTypes} from "../interfaces/ICommentTypes.sol";
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
        ICommentTypes.CommentData calldata,
        address,
        bytes32
    ) external payable returns (bool) {
        return true;
    }

    function afterComment(
        ICommentTypes.CommentData calldata,
        address,
        bytes32
    ) external pure returns (bool) {
        return true;
    }
}
