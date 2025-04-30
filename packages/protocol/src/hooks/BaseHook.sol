// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IHook} from "../interfaces/IHook.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {ERC165} from "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import {Hooks} from "../libraries/Hooks.sol";
import {Comments} from "../libraries/Comments.sol";

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
    function getHookPermissions() external pure virtual returns (Hooks.Permissions memory) {
        return _getHookPermissions();
    }

    function _getHookPermissions() internal pure virtual returns (Hooks.Permissions memory) {
        return Hooks.Permissions({
            beforeInitialize: false,
            afterInitialize: false,
            beforeComment: false,
            afterComment: false,
            beforeDeleteComment: false,
            afterDeleteComment: false
        });
    }

    /// @inheritdoc IHook
    function beforeInitialize(address channel) external virtual returns (bool) {
        return _beforeInitialize(channel);
    }

    function _beforeInitialize(address) internal virtual returns (bool) {
        revert HookNotImplemented();
    }

    /// @inheritdoc IHook
    function afterInitialize(address channel) external virtual returns (bool) {
        return _afterInitialize(channel);
    }

    function _afterInitialize(address) internal virtual returns (bool) {
        revert HookNotImplemented();
    }

    /// @inheritdoc IHook
    function beforeComment(
        Comments.CommentData calldata commentData,
        address caller,
        bytes32 commentId
    ) external payable virtual returns (bool) {
        return _beforeComment(commentData, caller, commentId);
    }

    function _beforeComment(
        Comments.CommentData calldata,
        address,
        bytes32
    ) internal virtual returns (bool) {
        revert HookNotImplemented();
    }

    /// @inheritdoc IHook
    function afterComment(
        Comments.CommentData calldata commentData,
        address caller,
        bytes32 commentId
    ) external payable virtual returns (bool) {
        return _afterComment(commentData, caller, commentId);
    }

    function _afterComment(
        Comments.CommentData calldata,
        address,
        bytes32
    ) internal virtual returns (bool) {
        revert HookNotImplemented();
    }

    /// @inheritdoc IHook
    function beforeDeleteComment(
        Comments.CommentData calldata commentData,
        address caller,
        bytes32 commentId
    ) external payable virtual returns (bool) {
        return _beforeDeleteComment(commentData, caller, commentId);
    }

    function _beforeDeleteComment(
        Comments.CommentData calldata,
        address,
        bytes32
    ) internal virtual returns (bool) {
        revert HookNotImplemented();
    }

    /// @inheritdoc IHook
    function afterDeleteComment(
        Comments.CommentData calldata commentData,
        address caller,
        bytes32 commentId
    ) external virtual returns (bool) {
        return _afterDeleteComment(commentData, caller, commentId);
    }

    function _afterDeleteComment(
        Comments.CommentData calldata,
        address,
        bytes32
    ) internal virtual returns (bool) {
        revert HookNotImplemented();
    }
} 