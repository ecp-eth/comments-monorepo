// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "./interfaces/IChannelManager.sol";
import "./interfaces/IProtocolFees.sol";
import "./ProtocolFees.sol";
import "./libraries/Comments.sol";

/// @title ChannelManager - A contract for managing comment channels and their hooks as NFTs
/// @notice This contract allows creation and management of channels with configurable hooks, where each channel is an NFT
/// @dev Implements channel management with the following security features:
contract ChannelManager is IChannelManager, ProtocolFees, ERC721Enumerable {
    // Mapping from channel ID to channel configuration
    mapping(uint256 => ChannelConfig) private channels;

    // Base URI for NFT metadata
    string private baseURIValue;

    address public commentsContract;

    /// @notice Generates a unique channel ID based on input parameters
    /// @param creator The address creating the channel
    /// @param name The name of the channel
    /// @param description The description of the channel
    /// @param metadata The channel metadata
    /// @return channelId The generated channel ID
    function _generateChannelId(
        address creator,
        string memory name,
        string memory description,
        string memory metadata
    ) internal view returns (uint256) {
        return
            uint256(
                keccak256(
                    abi.encodePacked(
                        creator,
                        name,
                        description,
                        metadata,
                        block.timestamp,
                        block.chainid
                    )
                )
            );
    }

    /// @notice Constructor sets the contract owner and initializes ERC721
    /// @param initialOwner The address that will own the contract
    constructor(
        address initialOwner
    ) ProtocolFees(initialOwner) ERC721("ECP Channel", "ECPC") {
        if (initialOwner == address(0)) revert ZeroAddress();

        // Create default channel with ID 0
        _safeMint(initialOwner, 0);

        ChannelConfig storage channelZero = channels[0];

        channelZero.name = "Home";
        channelZero.description = "Any kind of content";
        channelZero.metadata = "{}";
    }

    modifier onlyCommentsContract() {
        if (msg.sender != commentsContract) revert UnauthorizedCaller();
        _;
    }

    /// @notice Internal function to check if a channel exists
    /// @param channelId The channel ID to check
    /// @return bool Whether the channel exists
    function _channelExists(
        uint256 channelId
    ) internal view virtual returns (bool) {
        return _ownerOf(channelId) != address(0);
    }

    /// @inheritdoc IChannelManager
    function createChannel(
        string calldata name,
        string calldata description,
        string calldata metadata,
        address hook
    ) external payable returns (uint256 channelId) {
        if (msg.sender == address(0)) revert ZeroAddress();
        collectChannelCreationFee();

        // Generate channel ID using the internal function
        channelId = _generateChannelId(msg.sender, name, description, metadata);

        // Ensure channel ID doesn't already exist
        if (_channelExists(channelId)) revert ChannelAlreadyExists();

        _safeMint(msg.sender, channelId);

        ChannelConfig storage channel = channels[channelId];

        channel.name = name;
        channel.description = description;
        channel.metadata = metadata;

        // Add hook if provided
        if (hook != address(0)) {
            _setHook(channelId, hook);
        }

        emit ChannelCreated(channelId, name, metadata);
        return channelId;
    }

    /// @inheritdoc IChannelManager
    function updateChannel(
        uint256 channelId,
        string calldata name,
        string calldata description,
        string calldata metadata
    ) external {
        if (!_channelExists(channelId)) revert ChannelDoesNotExist();
        if (ownerOf(channelId) != msg.sender) revert UnauthorizedCaller();

        ChannelConfig storage channel = channels[channelId];

        channel.name = name;
        channel.description = description;
        channel.metadata = metadata;

        emit ChannelUpdated(channelId, name, description, metadata);
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

            // Call beforeInitialize hook if permitted
            if (permissions.beforeInitialize) {
                try IHook(hook).beforeInitialize(address(this)) returns (bool success) {
                    if (!success) revert HookInitializationFailed();
                } catch Error(string memory reason) {
                    revert(reason);
                } catch (bytes memory returnData) {
                    assembly {
                        revert(add(returnData, 0x20), mload(returnData))
                    }
                }
            }

            channels[channelId].hook = IHook(hook);
            channels[channelId].permissions = permissions;

            // Call afterInitialize hook if permitted
            if (permissions.afterInitialize) {
                try IHook(hook).afterInitialize(address(this)) returns (bool success) {
                    if (!success) revert HookInitializationFailed();
                } catch Error(string memory reason) {
                    revert(reason);
                } catch (bytes memory returnData) {
                    assembly {
                        revert(add(returnData, 0x20), mload(returnData))
                    }
                }
            }
        } else {
            delete channels[channelId].hook; // Properly reset to default value
        }

        emit HookSet(channelId, hook);
        emit HookStatusUpdated(channelId, hook, hook != address(0));
    }

    /// @inheritdoc IChannelManager
    function getChannel(
        uint256 channelId
    )
        external
        view
        returns (
            string memory name,
            string memory description,
            string memory metadata,
            address hook
        )
    {
        if (!_channelExists(channelId)) revert ChannelDoesNotExist();

        ChannelConfig storage channel = channels[channelId];
        return (
            channel.name,
            channel.description,
            channel.metadata,
            address(channel.hook)
        );
    }

    /// @inheritdoc IChannelManager
    function executeHook(
        uint256 channelId,
        Comments.CommentData calldata commentData,
        address caller,
        bytes32 commentId,
        Hooks.HookPhase phase
    ) external payable returns (bool) {
        if (!_channelExists(channelId)) revert ChannelDoesNotExist();

        ChannelConfig storage channel = channels[channelId];
        address hookAddress = address(channel.hook);

        if (hookAddress == address(0)) {
            return true;
        }

        // Calculate hook value after protocol fee
        uint256 hookValue = calculateHookTransactionFee(msg.value);

        // Execute the appropriate hook function based on phase
        if (phase == Hooks.HookPhase.BeforeComment) {
            if (!channel.permissions.beforeComment) return true;
            bool success;
            try
                channel.hook.beforeComment{value: hookValue}(
                    commentData,
                    caller,
                    commentId
                )
            returns (bool result) {
                success = result;
            } catch Error(string memory reason) {
                // Propagate the error message
                revert(reason);
            } catch (bytes memory returnData) {
                // Propagate custom errors
                assembly {
                    revert(add(returnData, 0x20), mload(returnData))
                }
            }
            if (!success) revert ChannelHookExecutionFailed();
            return true;
        } else if (phase == Hooks.HookPhase.AfterComment) {
            if (!channel.permissions.afterComment) return true;
            // After phase - don't revert on failure
            bool success = true;
            try
                channel.hook.afterComment(commentData, caller, commentId)
            returns (bool result) {
                success = result;
            } catch {
                emit HookExecutionFailed(channelId, hookAddress, phase);
                return true;
            }
            if (!success) {
                emit HookExecutionFailed(channelId, hookAddress, phase);
            }
            return success;
        } else if (phase == Hooks.HookPhase.BeforeDeleteComment) {
            if (!channel.permissions.beforeDeleteComment) return true;
            bool success = true;
            try
                channel.hook.beforeDeleteComment{value: msg.value}(
                    commentData,
                    caller,
                    commentId
                )
            returns (bool result) {
                success = result;
            } catch Error(string memory reason) {
                // Propagate the error message
                revert(reason);
            } catch (bytes memory returnData) {
                // Propagate custom errors
                assembly {
                    revert(add(returnData, 0x20), mload(returnData))
                }
            }
            if (!success) revert ChannelHookExecutionFailed();
            return true;
        } else if (phase == Hooks.HookPhase.AfterDeleteComment) {
            if (!channel.permissions.afterDeleteComment) return true;
            // After phase - don't revert on failure
            bool success = true;
            try
                channel.hook.afterDeleteComment(commentData, caller, commentId)
            returns (bool result) {
                success = result;
            } catch {
                emit HookExecutionFailed(channelId, hookAddress, phase);
                return true;
            }
            if (!success) {
                emit HookExecutionFailed(channelId, hookAddress, phase);
            }
            return success;
        }
        
        return true;
    }

    /// @inheritdoc IChannelManager
    function channelExists(uint256 channelId) public view returns (bool) {
        try this.ownerOf(channelId) returns (address) {
            return true;
        } catch {
            return false;
        }
    }

    /// @inheritdoc IChannelManager
    function getChannelOwner(
        uint256 channelId
    ) external view returns (address) {
        return ownerOf(channelId);
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
        if (bytes(baseURI_).length == 0)
            revert IChannelManager.InvalidBaseURI();
        baseURIValue = baseURI_;
        emit IChannelManager.BaseURIUpdated(baseURI_);
    }

    /// @notice Returns the base URI for token metadata
    /// @dev Internal function that overrides ERC721's _baseURI()
    function _baseURI() internal view virtual override returns (string memory) {
        return baseURIValue;
    }
}
