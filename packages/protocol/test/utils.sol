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
     * @return The hex string representation, prefixed with "0x"
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
     * @return The hex string representation, prefixed with "0x"
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
     * @return The hex string representation, prefixed with "0x"
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

    /**
     * @notice Parse an ETH amount from a string
     * @param contentBytes The bytes of the content to parse
     * @param startPos The position to start parsing from
     * @return found Whether a valid ETH amount was found
     * @return amount The amount in wei
     */
    function parseEthAmount(bytes memory contentBytes, uint256 startPos) internal pure returns (bool found, uint256 amount) {
        uint256 pos = startPos;
        uint256 startNum = pos;
        uint256 numberEndPos = pos;
        
        // Parse the number before "ETH"
        bool hasStartedNumber = false;
        bool hasDecimals = false;
        uint256 wholeNumber = 0;
        uint256 fractionalPart = 0;
        
        while (pos < contentBytes.length) {
            bytes1 currentChar = contentBytes[pos];
            
            // Check for valid number characters
            if (uint8(currentChar) >= 0x30 && uint8(currentChar) <= 0x39) { // ASCII '0' to '9'
                hasStartedNumber = true;
                if (hasDecimals) {
                    fractionalPart = fractionalPart * 10 + (uint8(currentChar) - 0x30); // ASCII '0' is 48
                } else {
                    wholeNumber = wholeNumber * 10 + (uint8(currentChar) - 0x30); // ASCII '0' is 48
                }
                numberEndPos = pos + 1;
                pos++;
            } else if (currentChar == 0x2e && !hasDecimals && hasStartedNumber) { // 0x2e is '.'
                hasDecimals = true;
                pos++;
            } else if (currentChar == 0x20 || currentChar == 0x45) { // 0x20 is space, 0x45 is 'E'
                // Allow both space and 'E' as separators
                break;
            } else {
                return (false, 0); // Invalid character found
            }
        }
        
        // Skip any remaining whitespace
        while (pos < contentBytes.length && contentBytes[pos] == 0x20) { // 0x20 is space
            pos++;
        }
        
        // Check for "ETH" suffix
        if (pos + 2 >= contentBytes.length) {
            return (false, 0); // Not enough characters for "ETH"
        }
        
        // Convert to uppercase for case-insensitive comparison
        bytes1 e = contentBytes[pos];
        bytes1 t = contentBytes[pos + 1];
        bytes1 h = contentBytes[pos + 2];
        
        // Convert to uppercase if lowercase
        if (e >= 0x61 && e <= 0x7a) e = bytes1(uint8(e) - 0x20); // 'a' to 'z' -> 'A' to 'Z'
        if (t >= 0x61 && t <= 0x7a) t = bytes1(uint8(t) - 0x20);
        if (h >= 0x61 && h <= 0x7a) h = bytes1(uint8(h) - 0x20);
        
        if (e != 0x45 || // 'E'
            t != 0x54 || // 'T'
            h != 0x48) { // 'H'
            return (false, 0); // Invalid "ETH" suffix
        }
        
        // Ensure we have a valid number to parse
        if (!hasStartedNumber) {
            return (false, 0); // No valid number found
        }

        return parseAndConvertAmount(contentBytes, startNum, numberEndPos);
    }
    
    /**
     * @notice Parse and convert an amount to wei
     * @param contentBytes The bytes of the content to parse
     * @param startNum The position where the number starts
     * @param endPos The position where the number ends
     * @return found Whether a valid amount was found
     * @return amount The amount in wei
     */
    function parseAndConvertAmount(
        bytes memory contentBytes,
        uint256 startNum,
        uint256 endPos
    ) internal pure returns (bool found, uint256 amount) {
        if (endPos < startNum) {
            return (false, 0); // Invalid range
        }
        
        if (endPos == startNum) {
            // Handle case where there's no number after the "ETH"
            return (true, 0);
        }
        
        // Convert the parsed number to wei
        uint256 wholeNumber = 0;
        uint256 fractionalPart = 0;
        uint256 currentPos = startNum;
        uint256 decimalsCount = 0;
        
        // Parse whole number part
        while (currentPos < endPos && contentBytes[currentPos] != 0x2e) { // 0x2e is '.'
            wholeNumber = wholeNumber * 10 + (uint8(contentBytes[currentPos]) - 0x30); // 0x30 is '0'
            currentPos++;
        }
        
        // Parse fractional part if present
        if (currentPos < endPos && contentBytes[currentPos] == 0x2e) { // 0x2e is '.'
            currentPos++; // Skip decimal point
            while (currentPos < endPos) {
                uint8 currentByte = uint8(contentBytes[currentPos]);
                if (currentByte >= 0x30 && currentByte <= 0x39) { // ASCII '0' to '9'
                    fractionalPart = fractionalPart * 10 + (currentByte - 0x30); // 0x30 is '0'
                    decimalsCount++;
                    currentPos++;
                } else {
                    break;
                }
            }
        }
        
        // Convert to wei
        if (fractionalPart == 0 && decimalsCount == 0) {
            // For whole numbers, simply multiply by 1 ether
            return (true, wholeNumber * 1 ether);
        } else {
            // For decimal numbers, calculate the fractional part separately
            // to avoid precision issues
            uint256 wholePart = wholeNumber * 1 ether;
            uint256 fractionalPartInWei = (fractionalPart * 1 ether) / (10 ** decimalsCount);
            return (true, wholePart + fractionalPartInWei);
        }
    }
} 