// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {ChannelManager} from "../src/ChannelManager.sol";
import {CommentsV1} from "../src/CommentsV1.sol";
import {IHook} from "../src/interfaces/IHook.sol";
import {ICommentTypes} from "../src/interfaces/ICommentTypes.sol";
import {IChannelManager} from "../src/interfaces/IChannelManager.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {ERC165} from "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {TestUtils} from "./utils.sol";

/// @title TipHook - A hook for processing ETH tips in reply comments
/// @notice This hook allows users to send ETH tips to comment authors by mentioning a tip amount in their reply
contract TipHook is IHook, ERC165 {
    using Strings for uint256;
    using TestUtils for string;
    
    error NotAReplyComment();
    error NoTipAmount();
    error TipTransferFailed();
    error InvalidTipSyntax();
    error TipAmountMismatch();

    struct TipInfo {
        bool found;
        uint256 amount;
    }

    // Reference to the CommentsV1 contract
    CommentsV1 public immutable comments;

    constructor(address _comments) {
        comments = CommentsV1(_comments);
    }

    /// @notice Checks if the contract implements the specified interface
    /// @param interfaceId The interface identifier to check
    /// @return True if the contract implements the interface
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC165, IERC165) returns (bool) {
        return interfaceId == type(IHook).interfaceId || super.supportsInterface(interfaceId);
    }

    /// @notice Execute before a comment is processed to handle ETH tips
    /// @param commentData The comment data to process
    /// @return success Whether the hook execution was successful
    function beforeComment(
        ICommentTypes.CommentData calldata commentData,
        address,
        bytes32
    ) external payable returns (bool) {
        // Extract parent author from targetUri
        (bool isReply, address parentAuthor, ) = TestUtils.parseTargetUri(commentData.targetUri, comments);
        
        // Only process for reply comments
        if (!isReply || parentAuthor == address(0)) {
            // For non-reply comments, return false if ETH was sent
            // This allows the ChannelManager to handle the revert
            return msg.value == 0;
        }

        // Parse the tip mention and amount
        TipInfo memory tipInfo = parseTipMention(commentData.content);
        
        if (tipInfo.found) {
            // Verify the sent amount matches the mentioned amount
            if (msg.value != tipInfo.amount) {
                console.log("Tip amount mismatch");
                console.log("Sent amount:", msg.value);
                console.log("Expected amount:", tipInfo.amount);
                revert TipAmountMismatch();
            }

            // Transfer the tip to the parent comment author
            console.log("Transferring tip to parent author", parentAuthor, msg.value);
            (bool success,) = parentAuthor.call{value: msg.value}("");
            if (!success) {
                revert TipTransferFailed();
            }
        } else if (msg.value > 0) {
            // If ETH was sent but no valid tip mention was found
            revert InvalidTipSyntax();
        } else {
           console.log("No tip amount found");
        }

        return true;
    }

    /// @notice Execute after a comment is processed
    /// @return success Whether the hook execution was successful
    function afterComment(
        ICommentTypes.CommentData calldata,
        address,
        bytes32
    ) external pure returns (bool) {
        return true;
    }

    /// @notice Parse a tip mention from a comment's content
    /// @param content The comment content to parse
    /// @return TipInfo struct containing whether a tip was found and its amount
    function parseTipMention(string memory content) internal view returns (TipInfo memory) {
        bytes memory contentBytes = bytes(content);
        string memory addrString = TestUtils.toHexString(address(this));
        bytes memory addrBytes = bytes(addrString);
        
        // Look for "!0x" pattern followed by the address
        for (uint i = 0; i < contentBytes.length; i++) {
            // Ensure there's enough room for "!0x" + address
            if (i + 2 + addrBytes.length >= contentBytes.length) continue;
            
            if (contentBytes[i] == '!' && 
                contentBytes[i + 1] == '0' && 
                contentBytes[i + 2] == 'x') {
                
                // Compare target address
                bool matchFound = true;
                for (uint j = 0; j < addrBytes.length; j++) {
                    if (i + 3 + j >= contentBytes.length || contentBytes[i + 3 + j] != addrBytes[j]) {
                        matchFound = false;
                        break;
                    }
                }
                
                // If address matches, look for amount
                if (matchFound && i + 3 + addrBytes.length < contentBytes.length) {
                    uint256 currentPos = i + 3 + addrBytes.length;
                    
                    // Skip whitespace
                    while (currentPos < contentBytes.length && contentBytes[currentPos] == ' ') {
                        currentPos++;
                    }
                    
                    // Try to parse the tip amount
                    if (currentPos < contentBytes.length) {
                        TipInfo memory result = parseTipAmount(contentBytes, currentPos);
                        if (result.found) {
                            return result;
                        }
                    }
                }
            }
        }
        return TipInfo(false, 0);
    }
    
    // Helper function to parse tip amount from the content bytes starting at the specified position
    function parseTipAmount(bytes memory contentBytes, uint256 startPos) internal pure returns (TipInfo memory) {
        uint256 currentPos = startPos;
        
        // Parse the number before "ETH"
        uint256 startNum = currentPos;
        uint256 decimalsCount = 0;
        bool hasDecimals = false;
        bool hasStartedNumber = false;
        
        while (currentPos < contentBytes.length) {
            bytes1 currentChar = contentBytes[currentPos];
            
            // Check for valid number characters
            if (currentChar >= '0' && currentChar <= '9') {
                hasStartedNumber = true;
                currentPos++;
                if (hasDecimals) decimalsCount++;
            } else if (currentChar == '.' && !hasDecimals && hasStartedNumber) {
                hasDecimals = true;
                currentPos++;
            } else if (currentChar == ' ' || currentChar == 'E') {
                // Allow both space and 'E' as separators
                break;
            } else {
                return TipInfo(false, 0); // Invalid character found
            }
        }
        
        // Skip any remaining whitespace
        while (currentPos < contentBytes.length && contentBytes[currentPos] == ' ') {
            currentPos++;
        }
        
        // Check for "ETH" suffix
        if (currentPos + 2 < contentBytes.length &&
            contentBytes[currentPos] == 'E' &&
            contentBytes[currentPos + 1] == 'T' &&
            contentBytes[currentPos + 2] == 'H') {
            
            // Ensure we have a valid number to parse
            if (!hasStartedNumber) {
                return TipInfo(false, 0); // No valid number found
            }
            
            return parseAndConvertAmount(contentBytes, startNum, currentPos);
        }
        
        return TipInfo(false, 0);
    }
    
    // Helper function to parse and convert the amount to wei
    function parseAndConvertAmount(
        bytes memory contentBytes, 
        uint256 startNum, 
        uint256 endPos
    ) internal pure returns (TipInfo memory) {
        uint256 wholeNumber = 0;
        uint256 fractionalPart = 0;
        uint256 currentDecimals = 0;
        uint256 currentPos = startNum;
        
        // Parse whole number part
        while (currentPos < endPos && contentBytes[currentPos] != '.') {
            wholeNumber = wholeNumber * 10 + (uint8(contentBytes[currentPos]) - 48);
            currentPos++;
        }
        
        // Parse fractional part if present
        if (currentPos < endPos && contentBytes[currentPos] == '.') {
            currentPos++; // Skip decimal point
            while (currentPos < endPos && contentBytes[currentPos] >= '0' && contentBytes[currentPos] <= '9') {
                fractionalPart = fractionalPart * 10 + (uint8(contentBytes[currentPos]) - 48);
                currentDecimals++;
                currentPos++;
            }
        }
        
        // Special case for "0.1" pattern
        if (wholeNumber == 0 && fractionalPart > 0) {
            uint256 weiAmount2 = (fractionalPart * 1 ether) / (10 ** currentDecimals);
            return TipInfo(true, weiAmount2);
        }
        
        uint256 weiAmount = wholeNumber * 1 ether;
        
        // Calculate fractional wei amount only if we have decimal digits
        if (fractionalPart > 0 && currentDecimals > 0) {
            uint256 fractionalWei;
            
            if (currentDecimals < 18) {
                // Scale up to wei precision (18 decimals)
                uint256 scalingFactor = 10**(18 - currentDecimals);
                
                // Check for overflow when scaling
                if (fractionalPart <= type(uint256).max / scalingFactor) {
                    fractionalWei = fractionalPart * scalingFactor;
                } else {
                    return TipInfo(false, 0); // Would overflow
                }
            } else if (currentDecimals == 18) {
                fractionalWei = fractionalPart;
            } else {
                // More than 18 decimals, truncate excess
                fractionalWei = fractionalPart / (10**(currentDecimals - 18));
            }
            
            // Check for overflow before adding
            if (weiAmount <= type(uint256).max - fractionalWei) {
                weiAmount += fractionalWei;
            } else {
                return TipInfo(false, 0); // Would overflow
            }
        }
        
        return TipInfo(true, weiAmount);
    }

    // Helper function to convert address to string
    function toHexString(address x) internal pure returns (string memory) {
        return TestUtils.toHexString(x);
    }

    function char(bytes1 b) internal pure returns (bytes1 c) {
        return TestUtils.char(b);
    }
}


contract TipHookTest is Test, IERC721Receiver {
    using TestUtils for string;
    
    ChannelManager public channelManager;
    TipHook public tipHook;
    CommentsV1 public comments;
    
    address public owner;
    address public user1;
    address public user2;
    address public user3;
    
    uint256 public channelId;

    function setUp() public {
        owner = address(this);
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");
        user3 = makeAddr("user3");
        
        // Deploy contracts in correct order
        comments = new CommentsV1(address(0));  // First deploy with zero address
        channelManager = new ChannelManager(owner, address(comments));  // Create with initial comments address
        comments = new CommentsV1(address(channelManager));  // Redeploy with correct address
        channelManager.updateCommentsContract(address(comments));  // Update the comments contract address
        
        // Deploy TipHook with the CommentsV1 address
        tipHook = new TipHook(address(comments));
        
        // Fund the ChannelManager with enough ETH for tests
        vm.deal(address(channelManager), 100 ether);
        
        // Register and enable the tip hook
        channelManager.registerHook{value: 0.02 ether}(address(tipHook));
        channelManager.setHookGloballyEnabled(address(tipHook), true);
        
        // Create a test channel with the tip hook
        channelId = channelManager.createChannel{value: 0.02 ether}(
            "Test Channel",
            "Test Description",
            "{}",
            address(tipHook)
        );
        
        // Fund test accounts
        vm.deal(user1, 100 ether);
        vm.deal(user2, 100 ether);
        vm.deal(user3, 100 ether);
        vm.deal(address(this), 100 ether); // Fund the test contract itself
    }
    
    /// @notice Test successful tip processing in a reply comment
    function testTipInReplyComment() public {
        // --- Parent Comment Setup ---
        ICommentTypes.CommentData memory parentCommentData = ICommentTypes.CommentData({
            content: "Parent comment",
            metadata: "{}",
            targetUri: "",
            commentType: "comment",
            author: user1,
            appSigner: user2,
            channelId: channelId,
            nonce: comments.nonces(user1, user2),
            deadline: block.timestamp + 1 days
        });
        
        // Post parent comment
        vm.prank(user1);
        comments.postCommentAsAuthor(parentCommentData, "");
        bytes32 parentId = comments.getCommentId(parentCommentData);

        uint256 initialBalance = user1.balance;

        // --- Reply Comment Setup (With Tip Mention) ---
        string memory replyTargetUri = TestUtils.createReplyTargetUri(parentId, address(comments));
        uint256 tipAmount = 0.1 ether;
        // Calculate total amount needed to send to result in the desired tip amount after protocol fee
        // To get 0.1 ETH after 10% fee, we need to send approximately 0.111111... ETH
        uint256 totalPaidAmount = tipAmount * TestUtils.getFeeMultiplier(1000);

        ICommentTypes.CommentData memory replyCommentData = ICommentTypes.CommentData({
            content: string(abi.encodePacked("Reply with tip !", TestUtils.toHexString(address(tipHook)), " 0.1 ETH")),
            metadata: "{}",
            targetUri: replyTargetUri,
            commentType: "comment",
            author: user2,
            appSigner: user2,
            channelId: channelId,
            nonce: comments.nonces(user2, user2),
            deadline: block.timestamp + 1 days
        });
        
        // --- Post Reply Comment (With Correct Tip Amount) ---
        vm.prank(user2);
        comments.postCommentAsAuthor{value: totalPaidAmount}(replyCommentData, "");
        console.log("user1 address:", user1);
        console.log("tipAmount", tipAmount, initialBalance, user1.balance);
        // The parent author should receive the tip amount after the 10% protocol fee is deducted
        assertEq(user1.balance, initialBalance + tipAmount, "Tip should be transferred to parent author after protocol fee");
    }
    
    /// @notice Test that hook reverts when sent ETH amount doesn't match mentioned amount
    function testRevertWhenTipAmountMismatch() public {
        ICommentTypes.CommentData memory parentCommentData = ICommentTypes.CommentData({
            content: "Parent comment",
            metadata: "{}",
            targetUri: "",
            commentType: "comment",
            author: user1,
            appSigner: user2,
            channelId: channelId,
            nonce: comments.nonces(user1, user2),
            deadline: block.timestamp + 1 days
        });
        
        // Post parent comment
        vm.prank(user1);
        comments.postCommentAsAuthor(parentCommentData, "");
        bytes32 parentCommentId = comments.getCommentId(parentCommentData);

        // --- Reply Comment Setup (With Tip Mention) ---
        string memory replyTargetUri = TestUtils.createReplyTargetUri(parentCommentId, address(comments));
        ICommentTypes.CommentData memory replyCommentData = ICommentTypes.CommentData({
            content: string(abi.encodePacked("Reply with tip !", TestUtils.toHexString(address(tipHook)), " 0.1ETH")),
            metadata: "{}",
            targetUri: replyTargetUri,
            commentType: "comment",
            author: user2,
            appSigner: user2,
            channelId: channelId,
            nonce: comments.nonces(user2, user2),
            deadline: block.timestamp + 1 days
        });
        
        // --- Post Reply Comment (With Incorrect Tip Amount) ---
        vm.prank(user2);
        vm.expectRevert(TipHook.TipAmountMismatch.selector);
        comments.postCommentAsAuthor{value: 0.05 ether}(replyCommentData, "");
    }

    /// @notice Test that hook reverts when tip syntax is invalid
    function testRevertWhenTipSyntaxInvalid() public {
        // --- Parent Comment Setup ---
        ICommentTypes.CommentData memory parentCommentData = ICommentTypes.CommentData({
            content: "Parent comment",
            metadata: "{}",
            targetUri: "",
            commentType: "comment",
            author: user1,
            appSigner: user2,
            channelId: channelId,
            nonce: comments.nonces(user1, user2),
            deadline: block.timestamp + 1 days
        });
        
        // Post parent comment
        vm.prank(user1);
        comments.postCommentAsAuthor(parentCommentData, "");
        bytes32 parentCommentId = comments.getCommentId(parentCommentData);

        // --- Reply Comment Setup (With Invalid Tip Syntax) ---
        string memory replyTargetUri = TestUtils.createReplyTargetUri(parentCommentId, address(comments));
        ICommentTypes.CommentData memory replyCommentData = ICommentTypes.CommentData({
            content: string(abi.encodePacked("Reply with invalid tip syntax !", TestUtils.toHexString(address(tipHook)), " invalid_amount")),
            metadata: "{}",
            targetUri: replyTargetUri,
            commentType: "comment",
            author: user2,
            appSigner: user2,
            channelId: channelId,
            nonce: comments.nonces(user2, user2),
            deadline: block.timestamp + 1 days
        });
        
        // --- Post Reply Comment (With Invalid Tip Syntax) ---
        vm.prank(user2);
        vm.expectRevert(TipHook.InvalidTipSyntax.selector);
        comments.postCommentAsAuthor{value: 0.1 ether}(replyCommentData, "");
    }

    /// @notice Test that no tip is processed when no tip is mentioned
    function testNoTipWithoutMention() public {
        // --- Parent Comment Setup ---
        ICommentTypes.CommentData memory parentCommentData = ICommentTypes.CommentData({
            content: "Parent comment",
            metadata: "{}",
            targetUri: "",
            commentType: "comment",
            author: user1,
            appSigner: user2,
            channelId: channelId,
            nonce: comments.nonces(user1, user2),
            deadline: block.timestamp + 1 days
        });
        
        // Post parent comment
        vm.prank(user1);
        comments.postCommentAsAuthor(parentCommentData, "");
        bytes32 parentCommentId = comments.getCommentId(parentCommentData);

        uint256 initialBalance = user1.balance;

        // --- Reply Comment Setup (No Tip Mention) ---
        string memory replyTargetUri = TestUtils.createReplyTargetUri(parentCommentId, address(comments));
        ICommentTypes.CommentData memory replyCommentData = ICommentTypes.CommentData({
            content: "Regular reply without tip", // No tip mention
            metadata: "{}",
            targetUri: replyTargetUri,
            commentType: "comment",
            author: user2,
            appSigner: user2,
            channelId: channelId,
            nonce: comments.nonces(user2, user2),
            deadline: block.timestamp + 1 days
        });
        
        // --- Post Reply Comment (No Value) ---
        vm.prank(user2);
        comments.postCommentAsAuthor(replyCommentData, "");
        
        assertEq(user1.balance, initialBalance, "Balance should not change without tip mention");
    }
    
    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }
} 