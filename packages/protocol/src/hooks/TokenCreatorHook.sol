// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { BaseHook } from "./BaseHook.sol";
import { Hooks } from "../libraries/Hooks.sol";
import { Comments } from "../libraries/Comments.sol";
import { Channels } from "../libraries/Channels.sol";
import { Metadata } from "../libraries/Metadata.sol";
import { Strings } from "@openzeppelin/contracts/utils/Strings.sol";
import {
  EnumerableMap
} from "@openzeppelin/contracts/utils/structs/EnumerableMap.sol";

/// @title TokenCreatorHook
/// @notice Hook that gates channels to only allow token creators to post top-level comments. Similar to telegram channels.
/// @dev Requires channel metadata to contain tokenAddress and tokenCreator fields
contract TokenCreatorHook is BaseHook {
  using Strings for string;
  using Strings for uint256;
  using EnumerableMap for EnumerableMap.UintToAddressMap;

  /// @notice Error thrown when token address is invalid
  error InvalidTokenAddress();
  /// @notice Error thrown when token creator is invalid
  error InvalidTokenCreator();
  /// @notice Error thrown when commenter does not match token creator
  error UnauthorizedCommenter();
  /// @notice Error thrown when target URI is invalid
  error InvalidTargetUri();
  /// @notice Error thrown when metadata is invalid
  error InvalidMetadata();
  /// @notice Error thrown when token chain ID is invalid
  error InvalidTokenChainId();

  /// @notice Structure to store token information
  /// @param tokenAddress The address of the token contract
  /// @param tokenCreator The address of the token creator
  /// @param tokenChainId The chain ID where the token exists
  struct TokenInfo {
    address tokenAddress;
    address tokenCreator;
    uint256 tokenChainId;
  }

  /// @notice Event emitted when token info for a channel is set up
  /// @param channelId The ID of the channel
  /// @param tokenAddress The address of the token contract
  /// @param tokenCreator The address of the token creator
  /// @param tokenChainId The chain ID where the token exists
  event ChannelSetup(
    uint256 indexed channelId,
    address tokenAddress,
    address tokenCreator,
    uint256 tokenChainId
  );

  // Mapping from channelId to TokenInfo
  EnumerableMap.UintToAddressMap private _channelIds;
  mapping(uint256 => TokenInfo) private _channelTokenInfo;

  /// @notice Get the total number of channels
  /// @return The number of channels
  function getChannelCount() public view returns (uint256) {
    return _channelIds.length();
  }

  /// @notice Get the channel ID at a specific index
  /// @param index The index to query
  /// @return The channel ID at the specified index
  function getChannelIdAt(uint256 index) public view returns (uint256) {
    (uint256 channelId, ) = _channelIds.at(index);
    return channelId;
  }

  /// @notice Get token information for a specific channel
  /// @param channelId The ID of the channel to query
  /// @return The token information for the channel
  function getChannelTokenInfo(
    uint256 channelId
  ) public view returns (TokenInfo memory) {
    return _channelTokenInfo[channelId];
  }

  /// @notice Check if a channel exists
  /// @param channelId The ID of the channel to check
  /// @return True if the channel exists, false otherwise
  function channelExists(uint256 channelId) public view returns (bool) {
    return _channelIds.contains(channelId);
  }

  /// @notice Get all channels with their token information
  /// @return channelIds Array of channel IDs
  /// @return tokenInfos Array of token information for each channel
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
        onInitialize: true,
        onCommentAdd: true,
        onCommentDelete: false,
        onCommentEdit: false,
        onChannelUpdate: false,
        onCommentHookDataUpdate: false
      });
  }

  function _onInitialize(
    address,
    Channels.Channel memory channel,
    uint256 channelId
  ) internal override returns (bool) {
    // Parse metadata to get token address and creator
    Metadata.MetadataEntry[] memory metadata = channel.metadata;
    if (metadata.length == 0) revert InvalidMetadata();

    // Find token address and creator in metadata
    address tokenAddress;
    address tokenCreator;
    uint256 tokenChainId;

    for (uint i = 0; i < metadata.length; i++) {
      if (metadata[i].key == ("string tokenAddress")) {
        tokenAddress = abi.decode(metadata[i].value, (address));
      } else if (metadata[i].key == ("string tokenCreator")) {
        tokenCreator = abi.decode(metadata[i].value, (address));
      } else if (metadata[i].key == ("string tokenChainId")) {
        tokenChainId = abi.decode(metadata[i].value, (uint256));
      }
    }

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

  function _onCommentAdd(
    Comments.Comment calldata commentData,
    Metadata.MetadataEntry[] calldata,
    address /* caller */,
    bytes32 /* commentId */
  ) internal view override returns (Metadata.MetadataEntry[] memory) {
    // Get token info for this channel
    TokenInfo memory tokenInfo = _channelTokenInfo[commentData.channelId];

    if (tokenInfo.tokenAddress == address(0)) {
      revert InvalidTokenAddress();
    }

    // Check if this is a top-level comment (no parent)
    if (commentData.parentId != bytes32(0)) {
      return new Metadata.MetadataEntry[](0);
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

    return new Metadata.MetadataEntry[](0);
  }
}
