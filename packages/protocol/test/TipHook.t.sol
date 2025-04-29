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
import {LibString} from "solady/utils/LibString.sol";

struct TipInfo {
    bool found;
    uint256 amount;
}

/// @title TipHook - A hook for processing ETH tips in reply comments
/// @notice This hook allows users to send ETH tips to comment authors by mentioning a tip amount in their reply
contract TipHook is IHook, ERC165 {
    using Strings for uint256;
    using TestUtils for string;

    error NotAReplyComment();
    error NoTipAmount();
    error TipTransferFailed();
    error InvalidTipSyntax(string);
    error TipAmountMismatch();

    // Reference to the CommentsV1 contract
    CommentsV1 public immutable comments;

    constructor(address _comments) {
        comments = CommentsV1(_comments);
    }

    /// @notice Checks if the contract implements the specified interface
    /// @param interfaceId The interface identifier to check
    /// @return True if the contract implements the interface
    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(ERC165, IERC165) returns (bool) {
        return
            interfaceId == type(IHook).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    /// @notice Execute before a comment is processed to handle ETH tips
    /// @param commentData The comment data to process
    /// @return success Whether the hook execution was successful
    function beforeComment(
        ICommentTypes.CommentData calldata commentData,
        address,
        bytes32
    ) external payable returns (bool) {
        // Check if this is a reply comment
        if (commentData.parentId == bytes32(0)) {
            // For non-reply comments, return false if ETH was sent
            // This allows the ChannelManager to handle the revert
            return msg.value == 0;
        }

        // Get the parent comment's author
        (address parentAuthor, , , , , , , , , ) = comments.comments(
            commentData.parentId
        );

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
            console.log(
                "Transferring tip to parent author",
                parentAuthor,
                msg.value
            );
            (bool success, ) = parentAuthor.call{value: msg.value}("");
            if (!success) {
                revert TipTransferFailed();
            }
        } else if (msg.value > 0) {
            revert InvalidTipSyntax(
                "ETH was sent but no valid tip mention was found"
            );
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
    /// @dev Tip syntax requirements:
    ///      1. Must start with "!" followed by the hook contract address (e.g., "!0x1234...")
    ///      2. After the address, must have a number followed by "ETH" (e.g., "0.1 ETH" or "0.1ETH")
    ///      3. The number can be a whole number or decimal (e.g., "1 ETH", "0.5 ETH", "0.01 ETH")
    ///      4. The "ETH" suffix can be directly attached to the number or separated by a space
    function parseTipMention(
        string memory content
    ) public view returns (TipInfo memory) {
        bytes memory contentBytes = bytes(content);
        string memory addrString = LibString.toHexString(
            uint160(address(this))
        );
        bytes memory addrBytes = bytes(addrString);

        // Look for "!" pattern followed by the address
        for (uint i = 0; i < contentBytes.length; i++) {
            // Ensure there's enough room for "!" + address
            if (i + addrBytes.length >= contentBytes.length) continue;

            if (contentBytes[i] == "!") {
                // Check if address matches
                (bool matchFound, uint256 addrStart) = checkAddressMatch(
                    contentBytes,
                    i,
                    addrBytes
                );

                // If address matches, look for amount
                if (
                    matchFound &&
                    addrStart + addrBytes.length < contentBytes.length
                ) {
                    uint256 currentPos = addrStart + addrBytes.length;

                    // Skip whitespace
                    currentPos = skipWhitespace(contentBytes, currentPos);

                    // Try to parse the tip amount
                    if (currentPos < contentBytes.length) {
                        // Find and parse the tip amount
                        TipInfo memory tipInfo = findAndParseTipAmount(
                            contentBytes,
                            currentPos
                        );
                        if (tipInfo.found) {
                            return tipInfo;
                        }
                    }
                }
            }
        }
        return TipInfo(false, 0);
    }

    // Helper function to check if the address matches
    function checkAddressMatch(
        bytes memory contentBytes,
        uint256 i,
        bytes memory addrBytes
    ) internal pure returns (bool matchFound, uint256 addrStart) {
        matchFound = true;
        addrStart = i + 1;

        for (uint j = 0; j < addrBytes.length; j++) {
            if (
                addrStart + j >= contentBytes.length ||
                contentBytes[addrStart + j] != addrBytes[j]
            ) {
                matchFound = false;
                break;
            }
        }

        return (matchFound, addrStart);
    }

    // Helper function to skip whitespace
    function skipWhitespace(
        bytes memory contentBytes,
        uint256 currentPos
    ) internal pure returns (uint256) {
        while (
            currentPos < contentBytes.length && contentBytes[currentPos] == " "
        ) {
            currentPos++;
        }
        return currentPos;
    }

    // Helper function to find and parse the tip amount
    function findAndParseTipAmount(
        bytes memory contentBytes,
        uint256 currentPos
    ) internal pure returns (TipInfo memory) {
        // Find the end position by looking for "ETH" suffix
        uint256 endPos = currentPos;
        while (endPos < contentBytes.length) {
            // Check for "ETH" suffix
            if (isEthSuffix(contentBytes, endPos)) {
                // Found "ETH" suffix, parse the amount
                (bool found, uint256 amount) = TestUtils.parseAndConvertAmount(
                    contentBytes,
                    currentPos,
                    endPos
                );
                if (found) {
                    return TipInfo(true, amount);
                }
            }
            endPos++;
        }
        return TipInfo(false, 0);
    }

    // Helper function to check if the current position has an "ETH" suffix
    function isEthSuffix(
        bytes memory contentBytes,
        uint256 pos
    ) internal pure returns (bool) {
        if (pos + 2 >= contentBytes.length) return false;

        // Convert current character to uppercase for case-insensitive comparison
        bytes1 c = contentBytes[pos];
        if (c >= 0x61 && c <= 0x7a) c = bytes1(uint8(c) - 0x20);

        // Check for "ETH" suffix
        if (c == 0x45) {
            // 'E'
            bytes1 t = contentBytes[pos + 1];
            bytes1 h = contentBytes[pos + 2];

            // Convert to uppercase if lowercase
            if (t >= 0x61 && t <= 0x7a) t = bytes1(uint8(t) - 0x20);
            if (h >= 0x61 && h <= 0x7a) h = bytes1(uint8(h) - 0x20);

            if (t == 0x54 && h == 0x48) {
                // 'T' and 'H'
                return true;
            }
        }
        return false;
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

abstract contract TipHookTest is Test, IERC721Receiver {
    using TestUtils for string;
    using LibString for string;

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

        (comments, channelManager) = TestUtils.createContracts(owner);

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
        ICommentTypes.CommentData memory parentCommentData = ICommentTypes
            .CommentData({
                content: "Parent comment",
                metadata: "{}",
                targetUri: "",
                commentType: "comment",
                author: user1,
                appSigner: user2,
                channelId: channelId,
                nonce: comments.nonces(user1, user2),
                deadline: block.timestamp + 1 days,
                parentId: bytes32(0)
            });

        // Post parent comment
        vm.prank(user1);
        comments.postCommentAsAuthor(parentCommentData, "");
        bytes32 parentId = comments.getCommentId(parentCommentData);

        uint256 initialBalance = user1.balance;

        // --- Reply Comment Setup (With Tip Mention) ---
        uint256 tipAmount = 0.1 ether;

        ICommentTypes.CommentData memory replyCommentData = ICommentTypes
            .CommentData({
                content: string(
                    abi.encodePacked(
                        "Reply with tip !",
                        LibString.toHexString(uint160(address(tipHook))),
                        " 0.1 ETH"
                    )
                ),
                metadata: "{}",
                targetUri: "",
                commentType: "comment",
                author: user2,
                appSigner: user2,
                channelId: channelId,
                nonce: comments.nonces(user2, user2),
                deadline: block.timestamp + 1 days,
                parentId: parentId
            });

        // --- Post Reply Comment (With Correct Tip Amount) ---
        vm.prank(user2);
        comments.postCommentAsAuthor{value: tipAmount}(replyCommentData, "");
        console.log("user1 address:", user1);
        console.log("tipAmount", tipAmount, initialBalance, user1.balance);
        // The parent author should receive the tip amount
        assertEq(
            user1.balance,
            initialBalance + tipAmount,
            "Tip should be transferred to parent author"
        );
    }

    /// @notice Test that hook reverts when sent ETH amount doesn't match mentioned amount
    function testRevertWhenTipAmountMismatch() public {
        ICommentTypes.CommentData memory parentCommentData = ICommentTypes
            .CommentData({
                content: "Parent comment",
                metadata: "{}",
                targetUri: "",
                commentType: "comment",
                author: user1,
                appSigner: user2,
                channelId: channelId,
                nonce: comments.nonces(user1, user2),
                deadline: block.timestamp + 1 days,
                parentId: bytes32(0)
            });

        // Post parent comment
        vm.prank(user1);
        comments.postCommentAsAuthor(parentCommentData, "");
        bytes32 parentCommentId = comments.getCommentId(parentCommentData);

        // --- Reply Comment Setup (With Tip Mention) ---
        ICommentTypes.CommentData memory replyCommentData = ICommentTypes
            .CommentData({
                content: string(
                    abi.encodePacked(
                        "Reply with tip !",
                        LibString.toHexString(uint160(address(tipHook))),
                        " 0.1ETH"
                    )
                ),
                metadata: "{}",
                targetUri: "",
                commentType: "comment",
                author: user2,
                appSigner: user2,
                channelId: channelId,
                nonce: comments.nonces(user2, user2),
                deadline: block.timestamp + 1 days,
                parentId: parentCommentId
            });

        // --- Post Reply Comment (With Incorrect Tip Amount) ---
        vm.prank(user2);
        vm.expectRevert(TipHook.TipAmountMismatch.selector);
        comments.postCommentAsAuthor{value: 0.05 ether}(replyCommentData, "");
    }

    /// @notice Test that hook reverts when tip syntax is invalid
    function testRevertWhenTipSyntaxInvalid() public {
        // --- Parent Comment Setup ---
        ICommentTypes.CommentData memory parentCommentData = ICommentTypes
            .CommentData({
                content: "Parent comment",
                metadata: "{}",
                targetUri: "",
                commentType: "comment",
                author: user1,
                appSigner: user2,
                channelId: channelId,
                nonce: comments.nonces(user1, user2),
                deadline: block.timestamp + 1 days,
                parentId: bytes32(0)
            });

        // Post parent comment
        vm.prank(user1);
        comments.postCommentAsAuthor(parentCommentData, "");
        bytes32 parentCommentId = comments.getCommentId(parentCommentData);

        // --- Reply Comment Setup (With Invalid Tip Syntax) ---
        ICommentTypes.CommentData memory replyCommentData = ICommentTypes
            .CommentData({
                content: string(
                    abi.encodePacked(
                        "Reply with invalid tip syntax !",
                        LibString.toHexString(uint160(address(tipHook))),
                        " invalid_amount"
                    )
                ),
                metadata: "{}",
                targetUri: "",
                commentType: "comment",
                author: user2,
                appSigner: user2,
                channelId: channelId,
                nonce: comments.nonces(user2, user2),
                deadline: block.timestamp + 1 days,
                parentId: parentCommentId
            });

        // --- Post Reply Comment (With Invalid Tip Syntax) ---
        vm.prank(user2);
        vm.expectRevert(TipHook.InvalidTipSyntax.selector);
        comments.postCommentAsAuthor{value: 0.1 ether}(replyCommentData, "");
    }

    /// @notice Test that no tip is processed when no tip is mentioned
    function testNoTipWithoutMention() public {
        // --- Parent Comment Setup ---
        ICommentTypes.CommentData memory parentCommentData = ICommentTypes
            .CommentData({
                content: "Parent comment",
                metadata: "{}",
                targetUri: "",
                commentType: "comment",
                author: user1,
                appSigner: user2,
                channelId: channelId,
                nonce: comments.nonces(user1, user2),
                deadline: block.timestamp + 1 days,
                parentId: bytes32(0)
            });

        // Post parent comment
        vm.prank(user1);
        comments.postCommentAsAuthor(parentCommentData, "");
        bytes32 parentCommentId = comments.getCommentId(parentCommentData);

        uint256 initialBalance = user1.balance;

        // --- Reply Comment Setup (No Tip Mention) ---
        ICommentTypes.CommentData memory replyCommentData = ICommentTypes
            .CommentData({
                content: "Regular reply without tip", // No tip mention
                metadata: "{}",
                targetUri: "",
                commentType: "comment",
                author: user2,
                appSigner: user2,
                channelId: channelId,
                nonce: comments.nonces(user2, user2),
                deadline: block.timestamp + 1 days,
                parentId: parentCommentId
            });

        // --- Post Reply Comment (No Value) ---
        vm.prank(user2);
        comments.postCommentAsAuthor(replyCommentData, "");

        assertEq(
            user1.balance,
            initialBalance,
            "Balance should not change without tip mention"
        );
    }

    /// @notice Test suite for the parseTipMention function
    function test_parseTipContent() public view {
        // Test case 1: Valid tip with space between number and ETH
        string memory validTipWithSpace = string(
            abi.encodePacked(
                "!",
                LibString.toHexString(uint160(address(tipHook))),
                " 0.1 ETH"
            )
        );
        TipInfo memory result = tipHook.parseTipMention(validTipWithSpace);
        assertTrue(result.found, "Should find valid tip with space");
        assertEq(result.amount, 0.1 ether, "Should parse 0.1 ETH correctly");

        // Test case 2: Valid tip with no space between number and ETH
        string memory validTipNoSpace = string(
            abi.encodePacked(
                "!",
                LibString.toHexString(uint160(address(tipHook))),
                " 0.1ETH"
            )
        );
        result = tipHook.parseTipMention(validTipNoSpace);
        assertTrue(result.found, "Should find valid tip without space");
        assertEq(result.amount, 0.1 ether, "Should parse 0.1ETH correctly");

        // Test case 3: Valid tip with whole number
        string memory wholeNumberTip = string(
            abi.encodePacked(
                "!",
                LibString.toHexString(uint160(address(tipHook))),
                " 1 ETH"
            )
        );
        result = tipHook.parseTipMention(wholeNumberTip);
        assertTrue(result.found, "Should find valid whole number tip");
        assertEq(result.amount, 1 ether, "Should parse 1 ETH correctly");

        // Test case 4: Valid tip with decimal number
        string memory decimalTip = string(
            abi.encodePacked(
                "!",
                LibString.toHexString(uint160(address(tipHook))),
                " 0.01 ETH"
            )
        );
        result = tipHook.parseTipMention(decimalTip);
        assertTrue(result.found, "Should find valid decimal tip");
        assertEq(result.amount, 0.01 ether, "Should parse 0.01 ETH correctly");

        // Test case 5: Invalid tip - wrong address
        string memory wrongAddressTip = string(
            abi.encodePacked(
                "!",
                LibString.toHexString(uint160(address(this))),
                " 0.1 ETH"
            )
        );
        result = tipHook.parseTipMention(wrongAddressTip);
        assertFalse(result.found, "Should not find tip with wrong address");

        // Test case 6: Invalid tip - missing number
        string memory missingNumberTip = string(
            abi.encodePacked(
                "!",
                LibString.toHexString(uint160(address(tipHook))),
                " ETH"
            )
        );
        result = tipHook.parseTipMention(missingNumberTip);
        assertFalse(result.found, "Should not find tip with missing number");

        // Test case 7: Invalid tip - invalid number format
        string memory invalidNumberTip = string(
            abi.encodePacked(
                "!",
                LibString.toHexString(uint160(address(tipHook))),
                " abc ETH"
            )
        );
        result = tipHook.parseTipMention(invalidNumberTip);
        assertFalse(
            result.found,
            "Should not find tip with invalid number format"
        );

        // Test case 8: Invalid tip - missing ETH suffix
        string memory missingEthSuffixTip = string(
            abi.encodePacked(
                "!",
                LibString.toHexString(uint160(address(tipHook))),
                " 0.1"
            )
        );
        result = tipHook.parseTipMention(missingEthSuffixTip);
        assertFalse(
            result.found,
            "Should not find tip with missing ETH suffix"
        );

        // Test case 9: Tip mention in the middle of text
        string memory tipInMiddle = string(
            abi.encodePacked(
                "Here's a tip ",
                "!",
                LibString.toHexString(uint160(address(tipHook))),
                " 0.1 ETH",
                " for you"
            )
        );
        result = tipHook.parseTipMention(tipInMiddle);
        assertTrue(
            result.found,
            "Should find tip mention in the middle of text"
        );
        assertEq(
            result.amount,
            0.1 ether,
            "Should parse 0.1 ETH correctly from middle of text"
        );

        // Test case 10: Multiple tip mentions (should find the first one)
        string memory multipleTips = string(
            abi.encodePacked(
                "!",
                LibString.toHexString(uint160(address(tipHook))),
                " 0.1 ETH and another !",
                LibString.toHexString(uint160(address(tipHook))),
                " 0.2 ETH"
            )
        );
        result = tipHook.parseTipMention(multipleTips);
        assertTrue(
            result.found,
            "Should find first tip mention when multiple exist"
        );
        assertEq(
            result.amount,
            0.1 ether,
            "Should parse first tip amount correctly"
        );
    }
}
