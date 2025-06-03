// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Test } from "forge-std/Test.sol";
import { Vm } from "forge-std/Vm.sol";
import {
  IERC721Receiver
} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import { Strings } from "@openzeppelin/contracts/utils/Strings.sol";
import { LibString } from "solady/utils/LibString.sol";
import { CommentManager } from "../src/CommentManager.sol";
import { ChannelManager } from "../src/ChannelManager.sol";
import { IHook } from "../src/interfaces/IHook.sol";
import { IChannelManager } from "../src/interfaces/IChannelManager.sol";
import { ICommentManager } from "../src/interfaces/ICommentManager.sol";
import { BaseHook } from "../src/hooks/BaseHook.sol";
import { Hooks } from "../src/libraries/Hooks.sol";
import { Comments } from "../src/libraries/Comments.sol";

/**
 * @title TestUtils
 * @notice Utility functions for testing the Comments protocol
 */
library TestUtils {
  using Strings for string;
  using LibString for string;

  /**
   * @notice Calculate the multiplier needed to cover a protocol fee
   * @param feePercentage The fee percentage (in basis points, where 100 = 1%)
   * @return The multiplier needed to cover the fee
   * @dev For example, if feePercentage is 1000 (10%), this returns 1.111111111111111111
   *      which when multiplied by an amount and divided by 1e18 gives the amount needed
   *      to cover the 10% fee
   */
  function getFeeMultiplier(
    uint256 feePercentage
  ) internal pure returns (uint256) {
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
  function parseEthAmount(
    bytes memory contentBytes,
    uint256 startPos
  ) internal pure returns (bool found, uint256 amount) {
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
      if (uint8(currentChar) >= 0x30 && uint8(currentChar) <= 0x39) {
        // ASCII '0' to '9'
        hasStartedNumber = true;
        if (hasDecimals) {
          fractionalPart = fractionalPart * 10 + (uint8(currentChar) - 0x30); // ASCII '0' is 48
        } else {
          wholeNumber = wholeNumber * 10 + (uint8(currentChar) - 0x30); // ASCII '0' is 48
        }
        numberEndPos = pos + 1;
        pos++;
      } else if (currentChar == 0x2e && !hasDecimals && hasStartedNumber) {
        // 0x2e is '.'
        hasDecimals = true;
        pos++;
      } else if (currentChar == 0x20 || currentChar == 0x45) {
        // 0x20 is space, 0x45 is 'E'
        // Allow both space and 'E' as separators
        break;
      } else {
        return (false, 0); // Invalid character found
      }
    }

    // Skip any remaining whitespace
    while (pos < contentBytes.length && contentBytes[pos] == 0x20) {
      // 0x20 is space
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

    if (
      e != 0x45 || // 'E'
      t != 0x54 || // 'T'
      h != 0x48
    ) {
      // 'H'
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
   * @param endPos The position where the number ends - exclusive of endPos
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
      // Handle case where there's no number
      return (false, 0);
    }

    // Convert the parsed number to wei
    uint256 wholeNumber = 0;
    uint256 fractionalPart = 0;
    uint256 currentPos = startNum;
    uint256 decimalsCount = 0;

    // Parse whole number part
    while (currentPos < endPos && contentBytes[currentPos] != 0x2e) {
      // 0x2e is '.'
      uint8 currentByte = uint8(contentBytes[currentPos]);
      if (currentByte < 0x30 || currentByte > 0x39) {
        return (false, 0); // Invalid digit found
      }
      wholeNumber = wholeNumber * 10 + (currentByte - 0x30); // 0x30 is '0'
      currentPos++;
    }

    // Parse fractional part if present
    if (currentPos < endPos && contentBytes[currentPos] == 0x2e) {
      // 0x2e is '.'
      currentPos++; // Skip decimal point
      while (currentPos < endPos) {
        uint8 currentByte = uint8(contentBytes[currentPos]);
        if (currentByte < 0x30 || currentByte > 0x39) {
          return (false, 0); // Invalid digit found
        }
        fractionalPart = fractionalPart * 10 + (currentByte - 0x30); // 0x30 is '0'
        decimalsCount++;
        currentPos++;
      }
    }

    // Convert to wei
    if (fractionalPart == 0 && decimalsCount == 0) {
      // For whole numbers, multiply by 1 ether safely
      if (wholeNumber == 0) {
        return (true, 0);
      }
      // Check for overflow before multiplication
      if (wholeNumber > type(uint256).max / 1 ether) {
        return (false, 0);
      }
      return (true, wholeNumber * 1 ether);
    }

    // For decimal numbers, calculate the amount in wei
    uint256 baseAmount = wholeNumber * 1 ether;
    uint256 fractionalAmount = fractionalPart *
      (1 ether / (10 ** decimalsCount));
    return (true, baseAmount + fractionalAmount);
  }

  /// @notice create the Comments and ChannelManager contracts and update the reference addresses accordingly
  /// @param owner The owner of the contracts
  /// @return comments The Comments contract
  /// @return channelManager The ChannelManager contract
  function createContracts(
    address owner
  ) internal returns (CommentManager comments, ChannelManager channelManager) {
    comments = new CommentManager(owner);
    channelManager = new ChannelManager(owner);

    // update contract addresses
    channelManager.updateCommentsContract(address(comments));
    comments.updateChannelContract(address(channelManager));

    return (comments, channelManager);
  }

  /// @notice Helper function to sign EIP-712 messages
  function signEIP712(
    Vm vm,
    uint256 privateKey,
    bytes32 digest
  ) internal pure returns (bytes memory) {
    (uint8 v, bytes32 r, bytes32 s) = vm.sign(privateKey, digest);
    return abi.encodePacked(r, s, v);
  }

  function generateAppSignature(
    Vm vm,
    Comments.CreateComment memory commentData,
    ICommentManager comments
  ) internal view returns (bytes memory) {
    uint256 appPrivateKey = 0x2;
    address app = vm.addr(appPrivateKey);

    commentData.app = app;
    bytes32 commentId = comments.getCommentId(commentData);
    bytes memory appSignature = signEIP712(vm, appPrivateKey, commentId);

    return appSignature;
  }

  function generateDummyCreateComment(
    address author,
    address app
  ) internal view returns (Comments.CreateComment memory) {
    return
      Comments.CreateComment({
        content: "Test comment",
        metadata: "{}",
        targetUri: "",
        commentType: "comment",
        author: author,
        app: app,
        channelId: 0,
        deadline: block.timestamp + 1 days,
        parentId: bytes32(0)
      });
  }

  function generateDummyEditComment(
    ICommentManager comments,
    address author,
    address app
  ) internal view returns (Comments.EditComment memory) {
    return
      Comments.EditComment({
        content: "Edited content",
        metadata: '{"edited":true}',
        app: app,
        nonce: comments.getNonce(author, app),
        deadline: block.timestamp + 1 days
      });
  }
  /**
   * @notice Struct to hold parsed CAIP-19 components
   * @param chainId The chain ID (e.g. "eip155:1")
   * @param assetNamespace The asset namespace (e.g. "erc20")
   * @param assetReference The asset reference (e.g. contract address)
   * @param tokenId Optional token ID for NFTs
   */
  struct CAIP19Components {
    string chainId;
    string assetNamespace;
    string assetReference;
    string tokenId;
  }

  /**
   * @notice Parse a CAIP-19 URL into its components
   * @param caip19Url The CAIP-19 URL to parse (e.g. "eip155:1/erc20:0x6b175474e89094c44da98b954eedeac495271d0f")
   * @return components The parsed CAIP-19 components
   * @return valid Whether the URL is valid
   */
  function parseCAIP19(
    string memory caip19Url
  ) internal pure returns (CAIP19Components memory components, bool valid) {
    bytes memory urlBytes = bytes(caip19Url);
    if (urlBytes.length == 0) return (components, false);

    // Find the first slash which separates chainId from assetNamespace:assetReference
    uint256 firstSlash = 0;
    for (uint256 i = 0; i < urlBytes.length; i++) {
      if (urlBytes[i] == "/") {
        firstSlash = i;
        break;
      }
    }
    if (firstSlash == 0) return (components, false);

    // Parse chainId
    bytes memory chainIdBytes = new bytes(firstSlash);
    for (uint256 i = 0; i < firstSlash; i++) {
      chainIdBytes[i] = urlBytes[i];
    }
    components.chainId = string(chainIdBytes);

    // Find the colon which separates assetNamespace from assetReference
    uint256 colon = 0;
    for (uint256 i = firstSlash + 1; i < urlBytes.length; i++) {
      if (urlBytes[i] == ":") {
        colon = i;
        break;
      }
    }
    if (colon == 0) return (components, false);

    // Parse assetNamespace
    bytes memory namespaceBytes = new bytes(colon - firstSlash - 1);
    for (uint256 i = 0; i < namespaceBytes.length; i++) {
      namespaceBytes[i] = urlBytes[firstSlash + 1 + i];
    }
    components.assetNamespace = string(namespaceBytes);

    // Check for tokenId (second slash)
    uint256 secondSlash = 0;
    for (uint256 i = colon + 1; i < urlBytes.length; i++) {
      if (urlBytes[i] == "/") {
        secondSlash = i;
        break;
      }
    }

    if (secondSlash > 0) {
      // Has tokenId
      bytes memory referenceBytes = new bytes(secondSlash - colon - 1);
      for (uint256 i = 0; i < referenceBytes.length; i++) {
        referenceBytes[i] = urlBytes[colon + 1 + i];
      }
      components.assetReference = string(referenceBytes);

      bytes memory tokenIdBytes = new bytes(urlBytes.length - secondSlash - 1);
      for (uint256 i = 0; i < tokenIdBytes.length; i++) {
        tokenIdBytes[i] = urlBytes[secondSlash + 1 + i];
      }
      components.tokenId = string(tokenIdBytes);
    } else {
      // No tokenId
      bytes memory referenceBytes = new bytes(urlBytes.length - colon - 1);
      for (uint256 i = 0; i < referenceBytes.length; i++) {
        referenceBytes[i] = urlBytes[colon + 1 + i];
      }
      components.assetReference = string(referenceBytes);
    }

    // Validate components
    if (
      bytes(components.chainId).length == 0 ||
      bytes(components.assetNamespace).length == 0 ||
      bytes(components.assetReference).length == 0
    ) {
      return (components, false);
    }

    return (components, true);
  }
}

// Mock hook contract for testing
contract MockHook is BaseHook {
  string public returningHookData;

  function setReturningHookData(string memory _returningHookData) external {
    returningHookData = _returningHookData;
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
        onCommentAdd: true,
        onCommentDelete: false,
        onCommentEdit: false,
        onChannelUpdate: false
      });
  }

  function _onCommentAdd(
    Comments.Comment calldata,
    address,
    bytes32
  ) internal virtual override returns (string memory) {
    return returningHookData;
  }
}

contract AlwaysReturningDataHook is BaseHook {
  function getHookPermissions()
    external
    pure
    override
    returns (Hooks.Permissions memory)
  {
    return
      Hooks.Permissions({
        onInitialize: false,
        onCommentAdd: true,
        onCommentDelete: false,
        onCommentEdit: true,
        onChannelUpdate: false
      });
  }

  function onCommentEdit(
    Comments.Comment calldata,
    address,
    bytes32
  ) external payable override returns (string memory) {
    return "hook data edited";
  }

  function onCommentAdd(
    Comments.Comment calldata,
    address,
    bytes32
  ) external payable override returns (string memory) {
    return "hook data";
  }
}
