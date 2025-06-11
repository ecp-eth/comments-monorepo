// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "./interfaces/IChannelManager.sol";
import "./interfaces/IProtocolFees.sol";
import "./ProtocolFees.sol";
import "./libraries/Comments.sol";
import "./libraries/Channels.sol";
import "./libraries/Metadata.sol";
import "./interfaces/IHook.sol";

/// @title ChannelManager - A contract for managing comment channels and their hooks as NFTs
/// @notice This contract allows creation and management of channels with configurable hooks, where each channel is an NFT
/// @dev Implements channel management with the following security features:
contract ChannelManager is IChannelManager, ProtocolFees, ERC721Enumerable {
  /// @notice Base URI for NFT metadata
  string internal baseURIValue;

  /// @notice Address of the comments contract
  address internal commentsContract;

  // Mapping from channel ID to channel configuration
  mapping(uint256 => Channels.Channel) internal channels;

  // Channel metadata storage mappings
  /// @notice Mapping of channel ID to metadata key to metadata value
  mapping(uint256 => mapping(bytes32 => bytes)) public channelMetadata;
  /// @notice Mapping of channel ID to array of metadata keys
  mapping(uint256 => bytes32[]) public channelMetadataKeys;

  /// @notice Constructor sets the contract owner and initializes ERC721
  /// @param initialOwner The address that will own the contract
  constructor(
    address initialOwner
  ) ProtocolFees(initialOwner) ERC721("ECP Channel", "ECPC") {
    if (initialOwner == address(0)) revert ZeroAddress();

    // Create default channel with ID 0
    _safeMint(initialOwner, 0);

    Channels.Channel storage channelZero = channels[0];

    channelZero.name = "Home";
    channelZero.description = "Any kind of content";
  }

  modifier onlyCommentsContract() {
    if (msg.sender != commentsContract) revert UnauthorizedCaller();
    _;
  }

  /// @inheritdoc IChannelManager
  function getChannel(
    uint256 channelId
  ) external view returns (Channels.Channel memory) {
    if (!_channelExists(channelId)) revert ChannelDoesNotExist();
    return channels[channelId];
  }

  /// @inheritdoc IChannelManager
  function getChannelId(
    address creator,
    string memory name,
    string memory description,
    Metadata.MetadataEntry[] memory metadata
  ) public pure returns (uint256) {
    return
      uint256(
        keccak256(
          abi.encodePacked(
            creator,
            keccak256(bytes(name)),
            keccak256(bytes(description)),
            _hashMetadataArray(metadata)
          )
        )
      );
  }

  /// @notice Internal function to check if a channel exists
  /// @param channelId The channel ID to check
  /// @return bool Whether the channel exists
  function _channelExists(
    uint256 channelId
  ) internal view virtual returns (bool) {
    return _ownerOf(channelId) != address(0);
  }

  /// @notice Internal function to hash metadata array for deterministic channel ID generation
  /// @param metadata The metadata array to hash
  /// @return The hash of the metadata array
  function _hashMetadataArray(
    Metadata.MetadataEntry[] memory metadata
  ) internal pure returns (bytes32) {
    bytes32[] memory hashedEntries = new bytes32[](metadata.length);

    for (uint i = 0; i < metadata.length; i++) {
      hashedEntries[i] = keccak256(
        abi.encode(
          keccak256("MetadataEntry(bytes32 key,bytes value)"),
          metadata[i].key,
          keccak256(metadata[i].value)
        )
      );
    }

    return keccak256(abi.encodePacked(hashedEntries));
  }

  /// @inheritdoc IChannelManager
  function createChannel(
    string calldata name,
    string calldata description,
    Metadata.MetadataEntry[] calldata metadata,
    address hook
  ) external payable returns (uint256 channelId) {
    collectChannelCreationFee();

    // Generate channel ID using the internal function
    channelId = getChannelId(msg.sender, name, description, metadata);

    // Ensure channel ID doesn't already exist
    if (_channelExists(channelId)) revert ChannelAlreadyExists();

    _safeMint(msg.sender, channelId);

    Channels.Channel storage channel = channels[channelId];

    channel.name = name;
    channel.description = description;
    channel.metadata = metadata;

    emit ChannelCreated(channelId, name, description, metadata);

    // Add hook if provided
    if (hook != address(0)) {
      _setHook(channelId, hook);
    }

    return channelId;
  }

  /// @inheritdoc IChannelManager
  function updateChannel(
    uint256 channelId,
    string calldata name,
    string calldata description,
    Metadata.MetadataEntry[] calldata metadata
  ) external {
    if (!_channelExists(channelId)) revert ChannelDoesNotExist();
    if (ownerOf(channelId) != msg.sender) revert UnauthorizedCaller();

    Channels.Channel storage channel = channels[channelId];

    channel.name = name;
    channel.description = description;
    channel.metadata = metadata;

    emit ChannelUpdated(channelId, name, description, metadata);

    if (channel.hook != address(0)) {
      IHook hook = IHook(channel.hook);
      Hooks.Permissions memory permissions = hook.getHookPermissions();

      if (permissions.onChannelUpdate) {
        hook.onChannelUpdate(address(this), channelId, channel);
      }
    }
  }

  /// @inheritdoc IChannelManager
  function setHook(uint256 channelId, address hook) external {
    if (!_channelExists(channelId)) revert ChannelDoesNotExist();
    if (ownerOf(channelId) != msg.sender) revert UnauthorizedCaller();

    return _setHook(channelId, hook);
  }

  /// @notice Internal function to set the hook for a channel
  /// @param channelId The unique identifier of the channel
  /// @param hook The address of the hook contract
  function _setHook(uint256 channelId, address hook) internal {
    // Emit events before calling the`onInitialize` hook to ensure the order of events is correct in the case of reentrancy
    emit HookSet(channelId, hook);
    emit HookStatusUpdated(channelId, hook, hook != address(0));

    if (hook != address(0)) {
      // Validate that the hook implements IHook interface
      try IERC165(hook).supportsInterface(type(IHook).interfaceId) returns (
        bool result
      ) {
        if (!result) revert InvalidHookInterface();
      } catch {
        revert InvalidHookInterface();
      }
      // Get hook permissions and store them on the channel
      Hooks.Permissions memory permissions = IHook(hook).getHookPermissions();

      channels[channelId].hook = hook;
      channels[channelId].permissions = permissions;

      // Call afterInitialize hook if permitted
      if (permissions.onInitialize) {
        IHook(hook).onInitialize(address(this), channels[channelId], channelId);
      }
    } else {
      delete channels[channelId].hook; // Properly reset to default value
    }
  }

  /// @inheritdoc IChannelManager
  function channelExists(uint256 channelId) external view returns (bool) {
    return _channelExists(channelId);
  }

  /// @inheritdoc IChannelManager
  function updateCommentsContract(
    address _commentsContract
  ) external onlyOwner {
    if (_commentsContract == address(0)) revert ZeroAddress();
    commentsContract = _commentsContract;
  }

  /// @inheritdoc IChannelManager
  function setBaseURI(string calldata baseURI_) external onlyOwner {
    if (bytes(baseURI_).length == 0) revert IChannelManager.InvalidBaseURI();
    baseURIValue = baseURI_;
    emit IChannelManager.BaseURIUpdated(baseURI_);
  }

  /// @notice Returns the base URI for token metadata
  /// @dev Internal function that overrides ERC721's _baseURI()
  function _baseURI() internal view virtual override returns (string memory) {
    return baseURIValue;
  }

  /// @inheritdoc IChannelManager
  function setChannelMetadata(
    uint256 channelId,
    Metadata.MetadataEntry[] calldata metadata
  ) external {
    if (!_channelExists(channelId)) revert ChannelDoesNotExist();
    if (ownerOf(channelId) != msg.sender) revert UnauthorizedCaller();

    // Clear existing metadata to prevent orphaned entries
    _clearChannelMetadata(channelId);

    // Store new metadata entries in mappings
    for (uint i = 0; i < metadata.length; i++) {
      bytes32 key = metadata[i].key;
      bytes memory value = metadata[i].value;

      channelMetadata[channelId][key] = value;
      channelMetadataKeys[channelId].push(key);

      emit ChannelMetadataSet(channelId, key, value);
    }

    // Notify hook of channel update if configured
    Channels.Channel memory channel = channels[channelId];
    if (channel.hook != address(0)) {
      IHook hook = IHook(channel.hook);
      Hooks.Permissions memory permissions = hook.getHookPermissions();

      if (permissions.onChannelUpdate) {
        hook.onChannelUpdate(address(this), channelId, channel);
      }
    }
  }

  /// @inheritdoc IChannelManager
  function getChannelMetadata(
    uint256 channelId
  ) external view returns (Metadata.MetadataEntry[] memory) {
    bytes32[] memory keys = channelMetadataKeys[channelId];
    Metadata.MetadataEntry[] memory metadata = new Metadata.MetadataEntry[](
      keys.length
    );

    for (uint i = 0; i < keys.length; i++) {
      metadata[i] = Metadata.MetadataEntry({
        key: keys[i],
        value: channelMetadata[channelId][keys[i]]
      });
    }

    return metadata;
  }

  /// @inheritdoc IChannelManager
  function getChannelMetadataValue(
    uint256 channelId,
    bytes32 key
  ) external view returns (bytes memory) {
    return channelMetadata[channelId][key];
  }

  /// @inheritdoc IChannelManager
  function getChannelMetadataKeys(
    uint256 channelId
  ) external view returns (bytes32[] memory) {
    return channelMetadataKeys[channelId];
  }

  /// @notice Internal function to clear all metadata for a channel
  /// @dev Removes all key-value pairs and clears the keys array to prevent orphaned data
  /// @param channelId The unique identifier of the channel
  function _clearChannelMetadata(uint256 channelId) internal {
    bytes32[] storage keys = channelMetadataKeys[channelId];
    // Delete all metadata values by iterating through keys
    for (uint i = 0; i < keys.length; i++) {
      delete channelMetadata[channelId][keys[i]];
    }
    // Clear the keys array
    delete channelMetadataKeys[channelId];
  }
}
