// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./ICommentTypes.sol";

interface IFeeCollector {
    /// @notice Struct containing context for fee collection
    /// @param payer Address paying the fee (msg.sender)
    /// @param author Address of the comment author
    /// @param appSigner Address of the app signer
    /// @param threadId ID of the thread this comment belongs to
    /// @param parentCommentId ID of the parent comment (if a reply)
    /// @param parentCommentAuthor Address of the parent comment author (if a reply)
    /// @param commentId ID of the current comment
    struct FeeContext {
        address payer;
        address author;
        address appSigner;
        bytes32 threadId;
        bytes32 parentCommentId;
        address parentCommentAuthor;
        bytes32 commentId;
    }

    /// @notice Collect fee for a comment operation
    /// @param context Struct containing all relevant context for fee distribution
    /// @param commentData The complete comment data being posted
    /// @param extraData Additional arbitrary data that may be needed by specific implementations
    function collectFee(
        FeeContext calldata context,
        ICommentTypes.CommentData calldata commentData,
        bytes calldata extraData
    ) external payable returns (bool);
    
    /// @notice Get the required fee amount for a given context
    /// @param context Struct containing all relevant context for fee calculation
    /// @param commentData The complete comment data being posted
    /// @param extraData Additional arbitrary data that may be needed by specific implementations
    function getFeeAmount(
        FeeContext calldata context,
        ICommentTypes.CommentData calldata commentData,
        bytes calldata extraData
    ) external view returns (uint256);

    /// @notice Get the current balance of fees available to withdraw for an address
    /// @param account The address to check the balance for
    /// @return The amount of fees available to withdraw
    function getBalance(address account) external view returns (uint256);

    /// @notice Withdraw accumulated fees
    /// @return success Whether the withdrawal was successful
    function withdraw() external returns (bool);
} 