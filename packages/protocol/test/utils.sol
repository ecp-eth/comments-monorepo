// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {ICommentTypes} from "../src/interfaces/ICommentTypes.sol";
import {CommentsV1} from "../src/CommentsV1.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title TestUtils
 * @notice Utility functions for testing the Comments protocol
 */
library TestUtils {
    using Strings for string;

    /**
     * @notice Extract a substring from a string
     * @param str The input string
     * @param startIndex The starting index (inclusive)
     * @param endIndex The ending index (exclusive)
     * @return The extracted substring
     */
    function substring(string memory str, uint256 startIndex, uint256 endIndex) internal pure returns (string memory) {
        bytes memory strBytes = bytes(str);
        bytes memory result = new bytes(endIndex - startIndex);
        for (uint256 i = startIndex; i < endIndex; i++) {
            result[i - startIndex] = strBytes[i];
        }
        return string(result);
    }

    /**
     * @notice Convert a uint256 to a hex string
     * @param value The value to convert
     * @return The hex string representation
     */
    function toHexString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0x0";
        }
        
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp >>= 4;
        }
        
        bytes memory buffer = new bytes(2 + digits);
        buffer[0] = "0";
        buffer[1] = "x";
        for (uint256 i = buffer.length - 1; i >= 2; i--) {
            buffer[i] = char(bytes1(uint8(value & 0xf)));
            value >>= 4;
        }
        return string(buffer);
    }

    /**
     * @notice Convert an address to a hex string
     * @param addr The address to convert
     * @return The hex string representation
     */
    function toHexString(address addr) internal pure returns (string memory) {
        bytes memory buffer = new bytes(42);
        buffer[0] = "0";
        buffer[1] = "x";
        uint256 value = uint256(uint160(addr));
        for (uint256 i = 41; i >= 2; i--) {
            buffer[i] = char(bytes1(uint8(value & 0xf)));
            value >>= 4;
        }
        return string(buffer);
    }

    /**
     * @notice Convert a bytes32 to a hex string
     * @param value The bytes32 to convert
     * @return The hex string representation
     */
    function toHexString(bytes32 value) internal pure returns (string memory) {
        bytes memory buffer = new bytes(66);
        buffer[0] = "0";
        buffer[1] = "x";
        for (uint256 i = 0; i < 32; i++) {
            uint8 b = uint8(value[i]);
            buffer[2 + i * 2] = char(bytes1(b >> 4));
            buffer[2 + i * 2 + 1] = char(bytes1(b & 0xf));
        }
        return string(buffer);
    }

    /**
     * @notice Convert a byte to a character
     * @param b The byte to convert
     * @return c The character representation
     */
    function char(bytes1 b) internal pure returns (bytes1 c) {
        uint8 val = uint8(b) & 0xf;
        if (val <= 9) {
            return bytes1(uint8(bytes1("0")) + val);
        } else {
            return bytes1(uint8(bytes1("a")) + (val - 10));
        }
    }

    /**
     * @notice Create a target URI for a reply comment
     * @param parentId The parent comment ID
     * @param commentsContract The address of the CommentsV1 contract
     * @return The target URI for the reply
     */
    function createReplyTargetUri(bytes32 parentId, address commentsContract) internal pure returns (string memory) {
        if (parentId == bytes32(0)) return "";
        
        // Convert parentId to hex string and remove 0x prefix
        string memory parentIdHex = toHexString(uint256(parentId));
        if (bytes(parentIdHex).length >= 2 && bytes(parentIdHex)[0] == "0" && bytes(parentIdHex)[1] == "x") {
            parentIdHex = substring(parentIdHex, 2, bytes(parentIdHex).length);
        }

        // Convert contract address to hex string and remove 0x prefix
        string memory commentsAddress = toHexString(commentsContract);
        if (bytes(commentsAddress).length >= 2 && bytes(commentsAddress)[0] == "0" && bytes(commentsAddress)[1] == "x") {
            commentsAddress = substring(commentsAddress, 2, bytes(commentsAddress).length);
        }

        return string(abi.encodePacked("eip155:1/", commentsAddress, "/", parentIdHex));
    }

    /**
     * @notice Parse a CAIP URL into commentId and parent URI
     * @param uri The CAIP URL
     * @param comments The CommentsV1 contract
     * @return isReply Whether this is a reply
     * @return parentAuthor The parent comment author
     * @return parentAppSigner The parent comment app signer
     */
    function parseTargetUri(string memory uri, CommentsV1 comments) internal view returns (bool isReply, address parentAuthor, address parentAppSigner) {
        // Split the URI into parts
        bytes memory uriBytes = bytes(uri);
        if (uriBytes.length == 0) return (false, address(0), address(0));

        // Find the last '/' to get the commentId
        int256 lastSlash = -1;
        for (uint256 i = 0; i < uriBytes.length; i++) {
            if (uriBytes[i] == "/") {
                lastSlash = int256(i);
            }
        }
        if (lastSlash == -1) return (false, address(0), address(0));

        // Extract the commentId
        string memory commentIdHex = substring(uri, uint256(lastSlash) + 1, uriBytes.length);
        
        // Ensure commentIdHex has 0x prefix for parseHexUint
        if (bytes(commentIdHex).length >= 2 && bytes(commentIdHex)[0] != "0" && bytes(commentIdHex)[1] != "x") {
            commentIdHex = string(abi.encodePacked("0x", commentIdHex));
        }
        
        bytes32 commentId = bytes32(Strings.parseHexUint(commentIdHex));

        // Get the parent comment's author and app signer
        (, , , , address author, address appSigner, , ,) = comments.comments(commentId);
        return (true, author, appSigner);
    }

    /**
     * @notice Calculate the multiplier needed to cover a protocol fee
     * @param feePercentage The fee percentage (in basis points, where 100 = 1%)
     * @return The multiplier needed to cover the fee
     * @dev For example, if feePercentage is 1000 (10%), this returns 1.111111111111111111
     *      which when multiplied by an amount and divided by 1e18 gives the amount needed
     *      to cover the 10% fee
     */
    function getFeeMultiplier(uint256 feePercentage) internal pure returns (uint256) {
        // Convert fee percentage to a decimal (e.g., 1000 basis points = 0.1)
        uint256 feeDecimal = feePercentage * 1e14; // 1e18 / 10000 = 1e14
        
        // Calculate the multiplier: 1 / (1 - fee)
        // For example, for a 10% fee: 1 / (1 - 0.1) = 1 / 0.9 = 1.111...
        uint256 denominator = 1e18 - feeDecimal;
        
        // Calculate with rounding: (numerator + denominator/2) / denominator
        uint256 result = (1e18 + (denominator / 2)) / denominator;
        
        return result;
    }
} 