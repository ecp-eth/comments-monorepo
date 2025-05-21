// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { BaseHook } from "./BaseHook.sol";
import { Hooks } from "../libraries/Hooks.sol";
import { Comments } from "../libraries/Comments.sol";
import { Channels } from "../libraries/Channels.sol";
import { Strings } from "@openzeppelin/contracts/utils/Strings.sol";
import { EnumerableMap } from "@openzeppelin/contracts/utils/structs/EnumerableMap.sol";

/**
 * @title TokenOwnerHook
 * @notice Hook that gates channels to only allow token creators to post top-level comments. Similar to telegram channels.
 * @dev Requires channel metadata to contain tokenAddress and tokenCreator fields
 */
contract TokenOwnerHook is BaseHook {
  using Strings for string;
  using Strings for uint256;
  using EnumerableMap for EnumerableMap.UintToAddressMap;

  error InvalidTokenAddress();
  error InvalidTokenCreator();
  error UnauthorizedCommenter();
  error InvalidTargetUri();
  error InvalidMetadata();
  error InvalidTokenChainId();

  struct TokenInfo {
    address tokenAddress;
    address tokenCreator;
    uint256 tokenChainId;
  }

  // Event emitted when a channel is set up
  event ChannelSetup(
    uint256 indexed channelId,
    address tokenAddress,
    address tokenCreator,
    uint256 tokenChainId
  );

  // Mapping from channelId to TokenInfo
  EnumerableMap.UintToAddressMap private _channelIds;
  mapping(uint256 => TokenInfo) private _channelTokenInfo;

  // Function to get total number of channels
  function getChannelCount() public view returns (uint256) {
    return _channelIds.length();
  }

  // Function to get channel ID at index
  function getChannelIdAt(uint256 index) public view returns (uint256) {
    (uint256 channelId, ) = _channelIds.at(index);
    return channelId;
  }

  // Function to get token info for a channel
  function getChannelTokenInfo(
    uint256 channelId
  ) public view returns (TokenInfo memory) {
    return _channelTokenInfo[channelId];
  }

  // Function to check if channel exists
  function channelExists(uint256 channelId) public view returns (bool) {
    return _channelIds.contains(channelId);
  }

  // Function to get all channels with their token info
  function getAllChannels()
    public
    view
    returns (uint256[] memory channelIds, TokenInfo[] memory tokenInfos)
  {
    uint256 count = getChannelCount();
    channelIds = new uint256[](count);
    tokenInfos = new TokenInfo[](count);

    for (uint256 i = 0; i < count; i++) {
      uint256 channelId = getChannelIdAt(i);
      channelIds[i] = channelId;
      tokenInfos[i] = _channelTokenInfo[channelId];
    }

    return (channelIds, tokenInfos);
  }

  function _getHookPermissions()
    internal
    pure
    override
    returns (Hooks.Permissions memory)
  {
    return
      Hooks.Permissions({
        onInitialized: true,
        onCommentAdded: true,
        onCommentEdited: false,
        onCommentDeleted: false,
        onChannelUpdated: false
      });
  }

  function _onInitialized(
    address,
    Channels.Channel memory channel,
    uint256 channelId
  ) internal override returns (bool) {
    // Parse metadata to get token address and creator
    bytes memory metadata = bytes(channel.metadata);
    if (metadata.length == 0) revert InvalidMetadata();

    // Simple JSON parsing for tokenAddress and tokenCreator
    string memory metadataStr = string(metadata);
    bytes memory tokenAddressBytes = _extractJsonValue(
      metadataStr,
      "tokenAddress"
    );
    bytes memory tokenCreatorBytes = _extractJsonValue(
      metadataStr,
      "tokenCreator"
    );
    bytes memory tokenChainIdBytes = _extractJsonValue(
      metadataStr,
      "tokenChainId"
    );

    if (
      tokenAddressBytes.length == 0 ||
      tokenCreatorBytes.length == 0 ||
      tokenChainIdBytes.length == 0
    ) {
      revert InvalidMetadata();
    }

    address tokenAddress = _bytesToAddress(tokenAddressBytes);
    address tokenCreator = _bytesToAddress(tokenCreatorBytes);
    uint256 tokenChainId = _bytesToUint(tokenChainIdBytes);

    if (tokenAddress == address(0)) revert InvalidTokenAddress();
    if (tokenCreator == address(0)) revert InvalidTokenCreator();
    if (tokenChainId == 0) revert InvalidTokenChainId();

    _channelTokenInfo[channelId] = TokenInfo({
      tokenAddress: tokenAddress,
      tokenCreator: tokenCreator,
      tokenChainId: tokenChainId
    });

    // Add channel to enumerable map
    _channelIds.set(channelId, tokenAddress);

    // Emit channel setup event
    emit ChannelSetup(channelId, tokenAddress, tokenCreator, tokenChainId);

    return true;
  }

  function _isValidTokenCAIP19(
    string memory targetUri,
    address tokenAddress,
    uint256 tokenChainId
  ) internal pure returns (bool) {
    // Construct expected CAIP-19 URI for ERC20 token
    string memory expectedUri = string.concat(
      "eip155:",
      Strings.toString(tokenChainId),
      "/erc20:",
      Strings.toHexString(uint160(tokenAddress), 20)
    );

    // Compare the URIs
    return keccak256(bytes(targetUri)) == keccak256(bytes(expectedUri));
  }

  function _onCommentAdded(
    Comments.Comment calldata commentData,
    address /* caller */,
    bytes32 /* commentId */
  ) internal view override returns (string memory) {
    // Get token info for this channel
    TokenInfo memory tokenInfo = _channelTokenInfo[commentData.channelId];

    if (tokenInfo.tokenAddress == address(0)) {
      revert InvalidTokenAddress();
    }

    // Check if this is a top-level comment (no parent)
    if (commentData.parentId != bytes32(0)) {
      return "";
    }

    // Only token creator can post top-level comments
    if (commentData.author != tokenInfo.tokenCreator) {
      revert UnauthorizedCommenter();
    }

    // Verify targetUri is a valid CAIP-19 for the token
    if (
      !_isValidTokenCAIP19(
        commentData.targetUri,
        tokenInfo.tokenAddress,
        tokenInfo.tokenChainId
      )
    ) {
      revert InvalidTargetUri();
    }

    return "";
  }

  function _bytesToUint(bytes memory b) internal pure returns (uint256) {
    uint256 result = 0;
    for (uint256 i = 0; i < b.length; i++) {
      if (b[i] < bytes1("0") || b[i] > bytes1("9")) return 0;
      result = result * 10 + (uint8(b[i]) - uint8(bytes1("0")));
    }
    return result;
  }

  function _bytesToAddress(bytes memory b) internal pure returns (address) {
    // Check length (0x + 40 hex chars)
    if (b.length != 42) return address(0);

    // Check 0x prefix
    if (b[0] != bytes1("0") || b[1] != bytes1("x")) return address(0);

    uint160 result = 0;
    for (uint i = 2; i < b.length; i++) {
      bytes1 char = b[i];
      uint8 nibble;

      if (char >= bytes1("0") && char <= bytes1("9")) {
        nibble = uint8(char) - uint8(bytes1("0"));
      } else if (char >= bytes1("a") && char <= bytes1("f")) {
        nibble = 10 + (uint8(char) - uint8(bytes1("a")));
      } else if (char >= bytes1("A") && char <= bytes1("F")) {
        nibble = 10 + (uint8(char) - uint8(bytes1("A")));
      } else {
        // Invalid hex character
        return address(0);
      }

      // Each hex char is 4 bits (a nibble). An address is 160 bits (20 bytes * 8 bits/byte).
      // We process 40 hex characters.
      // result = (result << 4) | nibble; // Shift by 4 for each nibble
      // This is equivalent to:
      if ((i % 2) == 0) {
        // High nibble (e.g., 'A' in 'AB')
        result = (result << 4) | uint160(nibble);
      } else {
        // Low nibble (e.g., 'B' in 'AB')
        result = (result << 4) | uint160(nibble);
      }
      // A slightly more direct way to build byte by byte:
      // uint160 tempResult = 0;
      // for (uint j = 0; j < 20; j++) { // 20 bytes for an address
      //    uint8 byteVal = (hexCharToNibble(b[2 + j*2]) << 4) | hexCharToNibble(b[2 + j*2 + 1]);
      //    tempResult = (tempResult << 8) | byteVal;
      // }
      // return address(tempResult);
      // The loop above is simpler and also correct for shifting nibbles.
    }
    // The loop iterates 40 times, shifting by 4 bits each time. 40 * 4 = 160 bits.
    return address(result);
  }

  // Helper for the alternative approach mentioned in comments - more explicit byte building
  function _hexCharToUint8(bytes1 char) private pure returns (uint8) {
    if (char >= bytes1("0") && char <= bytes1("9")) {
      return uint8(char) - uint8(bytes1("0"));
    }
    if (char >= bytes1("a") && char <= bytes1("f")) {
      return 10 + uint8(char) - uint8(bytes1("a"));
    }
    if (char >= bytes1("A") && char <= bytes1("F")) {
      return 10 + uint8(char) - uint8(bytes1("A"));
    }
    revert("Invalid hex character"); // Should not happen if pre-validated
  }

  function _bytesToAddressAlternative(
    bytes memory b
  ) internal pure returns (address) {
    if (b.length != 42) return address(0);
    if (b[0] != bytes1("0") || b[1] != bytes1("x")) return address(0);

    // Pre-validate all hex characters
    for (uint i = 2; i < 42; i++) {
      bytes1 char = b[i];
      if (
        !((char >= bytes1("0") && char <= bytes1("9")) ||
          (char >= bytes1("a") && char <= bytes1("f")) ||
          (char >= bytes1("A") && char <= bytes1("F")))
      ) {
        return address(0);
      }
    }

    uint160 out;
    // Each iteration processes one byte (two hex characters)
    for (uint i = 0; i < 20; i++) {
      // The characters are at indices 2+i*2 and 2+i*2+1
      uint8 c1 = _hexCharToUint8(b[2 + i * 2]); // High nibble
      uint8 c2 = _hexCharToUint8(b[2 + i * 2 + 1]); // Low nibble
      out = (out << 8) | uint160((c1 << 4) | c2);
    }
    return address(out);
  }

  function _extractJsonValue(
    string memory json,
    string memory key
  ) internal pure returns (bytes memory) {
    string memory searchStr = string.concat('"', key, '":"');
    bytes memory searchBytes = bytes(searchStr);
    bytes memory jsonBytes = bytes(json);

    // Prevent underflow if searchBytes is longer than jsonBytes
    // or if searchBytes is empty (though string.concat should prevent empty searchStr if key is not empty)
    if (searchBytes.length == 0 || searchBytes.length > jsonBytes.length) {
      return bytes(""); // Or new bytes(0)
    }

    // Corrected loop condition to prevent underflow and ensure all possibilities are checked.
    // The loop should go up to the last possible starting point for searchBytes.
    // Example: json="abc", search="bc". json.len=3, search.len=2.
    // json.len - search.len = 1. Loop i=0, i=1. Max i is 1.
    // i < jsonBytes.length - searchBytes.length + 1
    // OR i <= jsonBytes.length - searchBytes.length
    for (uint i = 0; i <= jsonBytes.length - searchBytes.length; i++) {
      bool found = true;
      for (uint j = 0; j < searchBytes.length; j++) {
        if (jsonBytes[i + j] != searchBytes[j]) {
          found = false;
          break;
        }
      }

      if (found) {
        uint start = i + searchBytes.length;
        // Ensure 'start' is within bounds before trying to find the end quote
        if (start >= jsonBytes.length) {
          // This means the key was found at the very end of the json string,
          // with no characters after it for a value, e.g. json = {"key":
          return bytes("");
        }

        uint end = start;
        // Find the closing quote for the value
        while (end < jsonBytes.length && jsonBytes[end] != bytes1('"')) {
          end++;
        }

        // If a closing quote was found and there's content between start and end
        if (end < jsonBytes.length && end > start) {
          bytes memory result = new bytes(end - start);
          for (uint k = 0; k < result.length; k++) {
            result[k] = jsonBytes[start + k];
          }
          return result;
        } else if (
          end == start &&
          end < jsonBytes.length &&
          jsonBytes[end] == bytes1('"')
        ) {
          // Case: "key":"" (empty string value)
          return bytes(""); // or new bytes(0)
        }
        // If no closing quote was found (end == jsonBytes.length) or value is malformed,
        // we could return empty or continue searching if multiple keys are possible.
        // For this simple parser, if the first match is malformed, we might just return empty.
        // Or, if we want to be robust to malformed values for a *specific* key instance
        // and allow finding other instances of the key, we would `continue;` here.
        // Given the current structure, finding the first key and then failing on its value
        // is reasonable. If no closing quote, it falls through to the main return.
      }
    }
    return bytes(""); // Key not found or value extraction failed
  }
}
