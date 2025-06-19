// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "solady/src/auth/Ownable.sol";
import "solady/src/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "./interfaces/IChannelManager.sol";
import "./interfaces/IProtocolFees.sol";
import "./ProtocolFees.sol";
import "./types/Comments.sol";
import "./types/Channels.sol";
import "./types/Metadata.sol";
import "./interfaces/IHook.sol";
import "./types/Comments.sol";
import "./types/Channels.sol";
import "./types/Metadata.sol";

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

  /// @notice Calculates a unique hash for a channel
  /// @param creator The address of the channel creator
  /// @param name The name of the channel
  /// @param description The description of the channel
  /// @param metadata The channel metadata entries
  /// @return bytes32 The computed hash
  function _getChannelId(
    address creator,
    string memory name,
    string memory description,
    Metadata.MetadataEntry[] memory metadata
  ) internal view returns (uint256) {
    return
      uint256(
        keccak256(
          abi.encodePacked(
            creator,
            keccak256(bytes(name)),
            keccak256(bytes(description)),
            _hashMetadataArray(metadata),
            block.timestamp,
            block.chainid
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
    _collectChannelCreationFee();

    // Generate channel ID using the internal function
    channelId = _getChannelId(msg.sender, name, description, metadata);

    // Ensure channel ID doesn't already exist
    if (_channelExists(channelId)) revert ChannelAlreadyExists();

    _safeMint(msg.sender, channelId);

    Channels.Channel storage channel = channels[channelId];

    channel.name = name;
    channel.description = description;
    channel.metadata = metadata;

    emit ChannelCreated(channelId, name, description, metadata, hook);

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
        hook.onChannelUpdate(address(this), channelId, channel, metadata);
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
    Metadata.MetadataEntryOp[] calldata operations
  ) external {
    if (!_channelExists(channelId)) revert ChannelDoesNotExist();
    if (ownerOf(channelId) != msg.sender) revert UnauthorizedCaller();

    // Apply metadata operations
    for (uint i = 0; i < operations.length; i++) {
      Metadata.MetadataEntryOp memory op = operations[i];

      if (op.operation == Metadata.MetadataOperation.DELETE) {
        _deleteChannelMetadataKey(channelId, op.key);
        emit ChannelMetadataSet(channelId, op.key, ""); // Emit empty value for deletion
      } else if (op.operation == Metadata.MetadataOperation.SET) {
        // Check if this is a new key for gas optimization
        bool isNewKey = !_channelMetadataKeyExists(channelId, op.key);

        channelMetadata[channelId][op.key] = op.value;

        // Only add to keys array if it's a new key
        if (isNewKey) {
          channelMetadataKeys[channelId].push(op.key);
        }

        emit ChannelMetadataSet(channelId, op.key, op.value);
      }
    }

    // Notify hook of channel update if configured
    Channels.Channel memory channel = channels[channelId];
    if (channel.hook != address(0)) {
      IHook hook = IHook(channel.hook);
      Hooks.Permissions memory permissions = hook.getHookPermissions();

      if (permissions.onChannelUpdate) {
        hook.onChannelUpdate(
          address(this),
          channelId,
          channel,
          getChannelMetadata(channelId)
        );
      }
    }
  }

  /// @notice Internal function to delete a specific channel metadata key
  /// @param channelId The unique identifier of the channel
  /// @param keyToDelete The key to delete
  function _deleteChannelMetadataKey(
    uint256 channelId,
    bytes32 keyToDelete
  ) internal {
    // Delete the value
    delete channelMetadata[channelId][keyToDelete];

    // Remove from keys array
    bytes32[] storage keys = channelMetadataKeys[channelId];
    for (uint i = 0; i < keys.length; i++) {
      if (keys[i] == keyToDelete) {
        // Move last element to current position and pop
        keys[i] = keys[keys.length - 1];
        keys.pop();
        break;
      }
    }
  }

  /// @notice Internal function to check if a channel metadata key exists
  /// @param channelId The unique identifier of the channel
  /// @param targetKey The key to check for existence
  /// @return exists Whether the key exists in the metadata
  function _channelMetadataKeyExists(
    uint256 channelId,
    bytes32 targetKey
  ) internal view returns (bool) {
    bytes32[] storage keys = channelMetadataKeys[channelId];
    for (uint i = 0; i < keys.length; i++) {
      if (keys[i] == targetKey) {
        return true;
      }
    }
    return false;
  }

  /// @inheritdoc IChannelManager
  function getChannelMetadata(
    uint256 channelId
  ) public view returns (Metadata.MetadataEntry[] memory) {
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
}
