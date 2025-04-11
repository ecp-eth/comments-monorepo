// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "./interfaces/IHook.sol";
import "./interfaces/IChannelManager.sol";
import "./interfaces/IFeeManager.sol";

/// @title ChannelManager - A contract for managing comment channels and their hooks as NFTs
/// @notice This contract allows creation and management of channels with configurable hooks, where each channel is an NFT
/// @dev Implements channel management with the following security features:
/// 1. Access Control:
///    - Only channel owners (NFT holders) can modify their channels
///    - Channel owners can add/remove hooks
///    - Channel owners can enable/disable hooks
/// 2. Hook System:
///    - Each channel can have one hook
///    - Hooks must implement IHook interface
///    - Hooks can be enabled/disabled
/// 3. Data Integrity:
///    - Channel IDs are sequential and match NFT token IDs
///    - Channel configurations are immutable unless changed by owner
/// 4. NFT Features:
///    - Each channel is a unique NFT
///    - Channels can be transferred between owners
///    - Supports standard NFT interfaces
contract ChannelManager is IChannelManager, IFeeManager, Ownable, ReentrancyGuard, ERC721Enumerable {
    // Mapping from channel ID to channel configuration
    mapping(uint256 => ChannelConfig) private channels;

    // Global hook registry
    mapping(address => bool) private registeredHooks;
    mapping(address => bool) private globallyEnabledHooks;

    // Base URI for NFT metadata
    string private baseURIValue;

    // Fee configuration
    uint256 private channelCreationFee;
    uint256 private hookRegistrationFee;
    uint16 private hookTransactionFeePercentage; // In basis points (1% = 100)
    uint256 private accumulatedFees;

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
        return uint256(keccak256(abi.encodePacked(
            creator,
            name,
            description,
            metadata,
            block.timestamp,
            block.chainid
        )));
    }

    /// @notice Constructor sets the contract owner and initializes ERC721
    /// @param initialOwner The address that will own the contract
    constructor(address initialOwner, address _commentsContract) 
        Ownable(initialOwner) 
        ERC721("ECP Channel", "ECPC") 
    {
        if (initialOwner == address(0)) revert ZeroAddress();
        if (_commentsContract == address(0)) revert ZeroAddress();

        // Initialize fees with safe defaults
        channelCreationFee = 0.02 ether;
        hookRegistrationFee = 0.02 ether;
        // 10% fee on hook revenue
        hookTransactionFeePercentage = 1000;
        accumulatedFees = 0;

        // Create default channel with ID 0
        _safeMint(initialOwner, 0);

        channels[0].name = "Home";
        channels[0].description = "Any kind of content";
        channels[0].metadata = "{}";
        channels[0].owner = initialOwner;
        channels[0].isPrivate = false;
        channels[0].isArchived = false;

        commentsContract = _commentsContract;
    }

    modifier onlyCommentsContract() {
        if (msg.sender != commentsContract) revert UnauthorizedCaller();
        _;
    }

    /// @notice Sets the fee for creating a new channel (only owner)
    /// @param fee The fee amount in wei
    function setChannelCreationFee(uint256 fee) external onlyOwner {
        channelCreationFee = fee;
        emit IFeeManager.ChannelCreationFeeUpdated(fee);
    }

    /// @notice Sets the fee for registering a new hook (only owner)
    /// @param fee The fee amount in wei
    function setHookRegistrationFee(uint256 fee) external onlyOwner {
        hookRegistrationFee = fee;
        emit IFeeManager.HookRegistrationFeeUpdated(fee);
    }

    /// @notice Sets the fee percentage taken from hook transactions (only owner)
    /// @param feePercentage The fee percentage in basis points (1% = 100)
    function setHookTransactionFee(uint16 feePercentage) external onlyOwner {
        if (feePercentage > 10000) revert InvalidFeePercentage(); // Max 100%
        hookTransactionFeePercentage = feePercentage;
        emit IFeeManager.HookTransactionFeeUpdated(feePercentage);
    }

    /// @notice Gets the current channel creation fee
    function getChannelCreationFee() external view returns (uint256) {
        return channelCreationFee;
    }

    /// @notice Gets the current hook registration fee
    function getHookRegistrationFee() external view returns (uint256) {
        return hookRegistrationFee;
    }

    /// @notice Gets the current hook transaction fee percentage
    function getHookTransactionFee() external view returns (uint16) {
        return hookTransactionFeePercentage;
    }

    /// @notice Withdraws accumulated fees to a specified address (only owner)
    /// @param recipient The address to receive the fees
    /// @return amount The amount withdrawn
    function withdrawFees(address recipient) external onlyOwner nonReentrant() returns (uint256 amount) {
        if (recipient == address(0)) revert ZeroAddress();
        
        amount = accumulatedFees;
        accumulatedFees = 0;
        
        (bool success, ) = recipient.call{value: amount}("");
        require(success, "Fee withdrawal failed");
        
        emit IFeeManager.FeesWithdrawn(recipient, amount);
        return amount;
    }

    /// @notice Registers a new hook in the global registry
    /// @param hook The address of the hook to register
    function registerHook(address hook) external payable nonReentrant() {
        if (msg.value < hookRegistrationFee) revert IChannelManager.InsufficientFee();
        
        if (hook == address(0)) revert IChannelManager.InvalidHookAddress();
        
        // Check if hook is already registered
        if (registeredHooks[hook]) revert IChannelManager.HookAlreadyRegistered();

        // Validate that the hook implements IHook interface
        try IERC165(hook).supportsInterface(type(IHook).interfaceId) returns (bool result) {
            if (!result) revert IChannelManager.InvalidHookInterface();
        } catch {
            revert IChannelManager.InvalidHookInterface();
        }

        registeredHooks[hook] = true;
        // Hooks are disabled by default
        globallyEnabledHooks[hook] = false;

        accumulatedFees += hookRegistrationFee;
        if (msg.value > hookRegistrationFee) {
            // Refund excess payment
            (bool success, ) = msg.sender.call{value: msg.value - hookRegistrationFee}("");
            require(success, "Refund failed");
        }

        emit IChannelManager.HookRegistered(hook);
        emit IChannelManager.HookGlobalStatusUpdated(hook, false);
    }

    /// @notice Enables or disables a hook globally (only owner)
    /// @param hook The address of the hook
    /// @param enabled Whether to enable or disable the hook
    function setHookGloballyEnabled(address hook, bool enabled) external onlyOwner {
        if (!registeredHooks[hook]) revert IChannelManager.HookNotRegistered();
        
        globallyEnabledHooks[hook] = enabled;
        emit IChannelManager.HookGlobalStatusUpdated(hook, enabled);
    }

    /// @notice Checks if a hook is registered and globally enabled
    /// @param hook The address of the hook
    /// @return registered Whether the hook is registered
    /// @return enabled Whether the hook is globally enabled
    function getHookStatus(address hook) external view returns (bool registered, bool enabled) {
        return (registeredHooks[hook], globallyEnabledHooks[hook]);
    }

    /// @notice Internal function to check if a channel exists
    /// @param channelId The channel ID to check
    /// @return bool Whether the channel exists
    function _channelExists(uint256 channelId) internal view virtual returns (bool) {
        return _ownerOf(channelId) != address(0);
    }

    /// @notice Creates a new channel as an NFT with a hash-based ID
    /// @param name The name of the channel
    /// @param description The description of the channel
    /// @param metadata The channel metadata (arbitrary JSON)
    /// @param isPrivate Whether the channel is private
    /// @param hooks Array of hook addresses to add to the channel
    /// @return channelId The unique identifier of the created channel
    function createChannel(
        string calldata name,
        string calldata description,
        string calldata metadata,
        bool isPrivate,
        address[] calldata hooks
    ) external payable returns (uint256 channelId) {
        if (msg.sender == address(0)) revert ZeroAddress();
        if (msg.value < channelCreationFee) revert InsufficientFee();

        // Generate channel ID using the internal function
        channelId = _generateChannelId(msg.sender, name, description, metadata);

        // Ensure channel ID doesn't already exist
        if (_channelExists(channelId)) revert ChannelAlreadyExists();

        _safeMint(msg.sender, channelId);

        channels[channelId].name = name;
        channels[channelId].description = description;
        channels[channelId].metadata = metadata;
        channels[channelId].owner = msg.sender;
        channels[channelId].isPrivate = isPrivate;
        channels[channelId].isArchived = false;

        accumulatedFees += channelCreationFee;
        if (msg.value > channelCreationFee) {
            // Refund excess payment
            (bool success, ) = msg.sender.call{value: msg.value - channelCreationFee}("");
            require(success, "Refund failed");
        }

        // Add hooks if provided
        if (hooks.length > 0) {
            require(hooks.length == 1, "Only one hook allowed");
            address hook = hooks[0];
            if (hook == address(0)) revert IChannelManager.InvalidHookAddress();
            
            // Validate that the hook implements IHook interface
            if (!IERC165(hook).supportsInterface(type(IHook).interfaceId)) {
                revert IChannelManager.InvalidHookInterface();
            }

            channels[channelId].hooks.push(IHook(hook));
            channels[channelId].hookEnabled[hook] = true;

            emit IChannelManager.HookAdded(channelId, hook);
            emit IChannelManager.HookStatusUpdated(channelId, hook, true);
        }

        return channelId;
    }

    /// @notice Updates an existing channel's configuration
    /// @param channelId The unique identifier of the channel
    /// @param name The new name of the channel
    /// @param description The new description of the channel
    /// @param metadata The new metadata
    /// @param isPrivate Whether the channel is private
    /// @param isArchived Whether the channel is archived
    function updateChannel(
        uint256 channelId,
        string calldata name,
        string calldata description,
        string calldata metadata,
        bool isPrivate,
        bool isArchived
    ) external {
        if (!_channelExists(channelId)) revert ChannelDoesNotExist();
        if (ownerOf(channelId) != msg.sender) revert NotChannelOwner();

        channels[channelId].name = name;
        channels[channelId].description = description;
        channels[channelId].metadata = metadata;
        channels[channelId].isPrivate = isPrivate;
        channels[channelId].isArchived = isArchived;
        channels[channelId].owner = msg.sender; // Update owner to current NFT owner

        emit ChannelUpdated(channelId, name, description, metadata, isPrivate, isArchived);
    }

    /// @notice Adds a hook to a channel
    /// @param channelId The unique identifier of the channel
    /// @param hook The address of the hook contract
    function addHook(uint256 channelId, address hook) external {
        if (!_channelExists(channelId)) revert IChannelManager.ChannelDoesNotExist();
        if (ownerOf(channelId) != msg.sender) revert IChannelManager.NotChannelOwner();
        if (hook == address(0)) revert IChannelManager.InvalidHookAddress();
        if (!registeredHooks[hook]) revert IChannelManager.HookNotRegistered();
        
        // Check if channel already has a hook
        if (channels[channelId].hooks.length > 0) {
            revert IChannelManager.ChannelAlreadyHasHook();
        }

        channels[channelId].hooks.push(IHook(hook));
        channels[channelId].hookEnabled[hook] = true;

        emit IChannelManager.HookAdded(channelId, hook);
        emit IChannelManager.HookStatusUpdated(channelId, hook, true);
    }

    /// @notice Removes a hook from a channel
    /// @param channelId The unique identifier of the channel
    /// @param hook The address of the hook contract
    function removeHook(uint256 channelId, address hook) external {
        if (!_channelExists(channelId)) revert IChannelManager.ChannelDoesNotExist();
        if (ownerOf(channelId) != msg.sender) revert IChannelManager.NotChannelOwner();

        // Check if the hook exists and is the only hook
        if (channels[channelId].hooks.length != 1 || address(channels[channelId].hooks[0]) != hook) {
            revert IChannelManager.HookNotFound();
        }

        delete channels[channelId].hooks[0];
        channels[channelId].hooks.pop();
        channels[channelId].hookEnabled[hook] = false;

        emit IChannelManager.HookRemoved(channelId, hook);
    }

    /// @notice Updates a hook's enabled status
    /// @param channelId The unique identifier of the channel
    /// @param hook The address of the hook contract
    /// @param enabled Whether the hook should be enabled
    function setHookEnabled(uint256 channelId, address hook, bool enabled) external {
        if (!_channelExists(channelId)) revert IChannelManager.ChannelDoesNotExist();
        if (ownerOf(channelId) != msg.sender) revert IChannelManager.NotChannelOwner();

        // Check if the hook exists and is the only hook
        if (channels[channelId].hooks.length != 1 || address(channels[channelId].hooks[0]) != hook) {
            revert IChannelManager.HookNotFound();
        }

        channels[channelId].hookEnabled[hook] = enabled;
        emit IChannelManager.HookStatusUpdated(channelId, hook, enabled);
    }

    /// @notice Gets a channel's configuration
    /// @param channelId The unique identifier of the channel
    /// @return name The name of the channel
    /// @return description The description of the channel
    /// @return metadata The channel metadata
    /// @return owner The address of the channel owner
    /// @return isPrivate Whether the channel is private
    /// @return isArchived Whether the channel is archived
    /// @return hooks Array of hook addresses for the channel
    function getChannel(uint256 channelId) external view returns (
        string memory name,
        string memory description,
        string memory metadata,
        address owner,
        bool isPrivate,
        bool isArchived,
        address[] memory hooks
    ) {
        if (!_channelExists(channelId)) revert IChannelManager.ChannelDoesNotExist();

        ChannelConfig storage channel = channels[channelId];
        address[] memory hooksArray = new address[](channel.hooks.length);
        for (uint i = 0; i < channel.hooks.length; i++) {
            hooksArray[i] = address(channel.hooks[i]);
        }
        
        return (
            channel.name,
            channel.description,
            channel.metadata,
            ownerOf(channelId), // Use NFT owner
            channel.isPrivate,
            channel.isArchived,
            hooksArray
        );
    }

    /// @notice Checks if a hook is enabled for a channel
    /// @param channelId The unique identifier of the channel
    /// @param hook The address of the hook contract
    /// @return enabled Whether the hook is enabled
    function isHookEnabled(uint256 channelId, address hook) external view returns (bool enabled) {
        if (!_channelExists(channelId)) revert IChannelManager.ChannelDoesNotExist();
        return channels[channelId].hookEnabled[hook];
    }

    /// @notice Public function to execute hook for a channel
    /// @param channelId The unique identifier of the channel
    /// @param commentData The comment data to process
    /// @param caller The address that initiated the transaction
    /// @param commentId The unique identifier of the comment
    /// @param phase The phase of hook execution (Before or After)
    /// @return success Whether the hook execution was successful
    function executeHooks(
        uint256 channelId,
        ICommentTypes.CommentData memory commentData,
        address caller,
        bytes32 commentId,
        HookPhase phase
    ) external payable onlyCommentsContract returns (bool) {
        if (!_channelExists(channelId)) revert IChannelManager.ChannelDoesNotExist();

        ChannelConfig storage channel = channels[channelId];
        if (channel.hooks.length == 0) {
            return true;
        }

        IHook hook = channel.hooks[0];
        address hookAddress = address(hook);
        
        // Check both global and channel-specific enablement
        if (!registeredHooks[hookAddress]) revert IChannelManager.HookNotRegistered();
        if (!globallyEnabledHooks[hookAddress]) revert IChannelManager.HookDisabledGlobally();
        if (!channel.hookEnabled[hookAddress]) {
            return true; // Skip execution if hook is disabled at channel level
        }

        // Calculate and deduct protocol fee if there's a payment
        uint256 protocolFee = 0;
        uint256 hookValue = msg.value;
        if (msg.value > 0 && hookTransactionFeePercentage > 0) {
            protocolFee = (msg.value * hookTransactionFeePercentage) / 10000;
            hookValue = msg.value - protocolFee;
            accumulatedFees += protocolFee;
        }

        // Execute the appropriate hook function based on phase
        if (phase == HookPhase.Before) {
            bool success;
            try hook.beforeComment{value: hookValue}(commentData, caller, commentId) returns (bool result) {
                success = result;
            } catch Error(string memory reason) {
                // Propagate the error message
                revert(reason);
            } catch {
                revert IChannelManager.ChannelHookExecutionFailed();
            }
            if (!success) revert IChannelManager.ChannelHookExecutionFailed();
            return true;
        } else {
            // After phase - don't revert on failure
            bool success = true;
            try hook.afterComment(commentData, caller, commentId) returns (bool result) {
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
    }

    /// @notice Check if a channel exists
    /// @param channelId The channel ID to check
    /// @return bool Whether the channel exists
    function channelExists(uint256 channelId) external view returns (bool) {
        return _channelExists(channelId);
    }

    /// @notice Fallback function to receive ETH
    receive() external payable {
        accumulatedFees += msg.value;
    }

    /// @notice Updates the comments contract address (only owner)
    /// @param _commentsContract The new comments contract address
    function updateCommentsContract(address _commentsContract) external onlyOwner {
        if (_commentsContract == address(0)) revert ZeroAddress();
        commentsContract = _commentsContract;
    }

    /// @notice Sets the base URI for NFT metadata
    /// @param baseURI_ The new base URI
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
} 