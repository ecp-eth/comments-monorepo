// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { BaseHook } from "./BaseHook.sol";
import { Hooks } from "../types/Hooks.sol";
import { Comments } from "../types/Comments.sol";
import { Channels } from "../types/Channels.sol";
import { Metadata } from "../types/Metadata.sol";
import { ChannelManager } from "../ChannelManager.sol";
import {
  EnumerableMap
} from "@openzeppelin/contracts/utils/structs/EnumerableMap.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import {
  IERC721Receiver
} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

/// @title BroadcastHook
/// @notice Hook that gates channels to only allow whitelisted creators to create channels and post top-level comments.
/// @dev Similar to TokenCreatorHook but uses a whitelist instead of token ownership
contract BroadcastHook is BaseHook, Ownable, IERC721Receiver {
  using EnumerableMap for EnumerableMap.UintToAddressMap;

  /// @notice Error thrown when caller is not whitelisted
  error NotWhitelisted();
  /// @notice Error thrown when commenter is not the channel creator
  error UnauthorizedCommenter();
  /// @notice Error thrown when metadata is invalid
  error InvalidMetadata();
  /// @notice Error thrown when insufficient funds are provided
  error InsufficientFunds();
  /// @notice Error thrown when an invalid address is provided
  error InvalidAddress();

  /// @notice Event emitted when a channel is created
  /// @param channelId The ID of the channel
  /// @param creator The address of the channel creator
  /// @param name The name of the channel
  /// @param description The description of the channel
  /// @param metadata Metadata entries for the channel
  event ChannelCreated(
    uint256 indexed channelId,
    address indexed creator,
    string name,
    string description,
    Metadata.MetadataEntry[] metadata
  );

  /// @notice Event emitted when whitelist mode is toggled
  /// @param enabled Whether whitelist mode is enabled
  event WhitelistModeSet(bool enabled);

  /// @notice Event emitted when an address is whitelisted/unwhitelisted
  /// @param user The address that was modified
  /// @param isWhitelisted Whether the address is now whitelisted
  event WhitelistStatusChanged(address indexed user, bool isWhitelisted);

  // Channel manager contract reference
  ChannelManager public immutable channelManager;

  // Mapping to track whitelisted addresses
  mapping(address => bool) private _whitelisted;

  // Mapping to track channel creators
  EnumerableMap.UintToAddressMap private _channelCreators;

  // Whether whitelist mode is enabled
  bool public whitelistModeEnabled = true;

  constructor(address _channelManager) Ownable(msg.sender) {
    if (_channelManager == address(0)) revert InvalidAddress();
    channelManager = ChannelManager(payable(_channelManager));
  }

  /// @notice Create a new channel
  /// @param name The name of the channel
  /// @param description The description of the channel
  /// @param metadata Metadata entries for the channel
  /// @return channelId The ID of the created channel
  function createChannel(
    string calldata name,
    string calldata description,
    Metadata.MetadataEntry[] calldata metadata
  ) external payable returns (uint256) {
    // Check if caller is whitelisted when whitelist mode is enabled
    if (whitelistModeEnabled && !_whitelisted[msg.sender]) {
      revert NotWhitelisted();
    }

    // Calculate the required fee
    uint256 requiredFee = channelManager.getChannelCreationFee();

    if (msg.value < requiredFee) {
      revert InsufficientFunds();
    }

    // Create the channel through channel manager
    uint256 channelId = channelManager.createChannel{ value: requiredFee }(
      name,
      description,
      metadata,
      address(this)
    );

    // Store the channel creator
    _channelCreators.set(channelId, msg.sender);

    // Transfer channel ownership to the actual creator
    channelManager.safeTransferFrom(address(this), msg.sender, channelId);

    // Emit channel created event
    emit ChannelCreated(channelId, msg.sender, name, description, metadata);

    // Return any excess funds
    if (msg.value > requiredFee) {
      (bool success, ) = msg.sender.call{ value: msg.value - requiredFee }("");
      require(success, "Failed to return excess funds");
    }

    return channelId;
  }

  /// @notice Get all channels
  /// @return channelIds Array of channel IDs
  /// @return creators Array of channel creators
  function getChannels()
    external
    view
    returns (uint256[] memory channelIds, address[] memory creators)
  {
    uint256 count = _channelCreators.length();
    channelIds = new uint256[](count);
    creators = new address[](count);

    for (uint256 i = 0; i < count; i++) {
      (uint256 channelId, address creator) = _channelCreators.at(i);
      channelIds[i] = channelId;
      creators[i] = creator;
    }

    return (channelIds, creators);
  }

  /// @notice Enable or disable whitelist mode
  /// @param enabled Whether whitelist mode should be enabled
  function setWhitelistMode(bool enabled) external onlyOwner {
    whitelistModeEnabled = enabled;
    emit WhitelistModeSet(enabled);
  }

  /// @notice Add or remove an address from the whitelist
  /// @param user The address to modify
  /// @param status The new whitelist status
  function setWhitelistStatus(address user, bool status) external onlyOwner {
    _whitelisted[user] = status;
    emit WhitelistStatusChanged(user, status);
  }

  /// @notice Check if an address is whitelisted
  /// @param user The address to check
  /// @return Whether the address is whitelisted
  function isWhitelisted(address user) external view returns (bool) {
    return _whitelisted[user];
  }

  function _getHookPermissions()
    internal
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
        onChannelUpdate: false,
        onCommentHookDataUpdate: false
      });
  }

  function _onCommentAdd(
    Comments.Comment calldata commentData,
    Metadata.MetadataEntry[] calldata,
    address /* caller */,
    bytes32 /* commentId */
  ) internal view override returns (Metadata.MetadataEntry[] memory) {
    // Only check top-level comments
    if (commentData.parentId != bytes32(0)) {
      return new Metadata.MetadataEntry[](0);
    }

    // Get the channel creator
    (bool exists, address creator) = _channelCreators.tryGet(
      commentData.channelId
    );
    require(exists, "Channel not found");

    // Only channel creator can post top-level comments
    if (commentData.author != creator) {
      revert UnauthorizedCommenter();
    }

    return new Metadata.MetadataEntry[](0);
  }

  /// @notice Allows the contract to receive ERC721 tokens
  function onERC721Received(
    address,
    address,
    uint256,
    bytes calldata
  ) external pure override returns (bytes4) {
    return IERC721Receiver.onERC721Received.selector;
  }

  /// @notice Allows the contract to receive ETH
  receive() external payable {}
}
