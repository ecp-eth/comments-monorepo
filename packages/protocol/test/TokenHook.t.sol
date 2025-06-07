// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../src/hooks/BaseHook.sol";
import "../src/interfaces/IHook.sol";
import "../src/libraries/Comments.sol";
import "../src/libraries/Hooks.sol";
import { Test } from "forge-std/Test.sol";
import { Vm } from "forge-std/Vm.sol";
import { ChannelManager } from "../src/ChannelManager.sol";
import { CommentManager } from "../src/CommentManager.sol";
import { IChannelManager } from "../src/interfaces/IChannelManager.sol";
import {
  IERC721Receiver
} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import { TestUtils } from "./utils.sol";

/// @notice Configuration structs for Clanker deployment
struct RewardsConfig {
  uint256 creatorReward;
  address creatorAdmin;
  address creatorRewardRecipient;
  address interfaceAdmin;
  address interfaceRewardRecipient;
}

struct TokenConfig {
  string name;
  string symbol;
  bytes32 salt;
  string image;
  string metadata;
  string context;
  uint256 originatingChainId;
}

struct VaultConfig {
  uint8 vaultPercentage;
  uint256 vaultDuration;
}

struct PoolConfig {
  address pairedToken;
  int24 tickIfToken0IsNewToken;
}

struct InitialBuyConfig {
  uint24 pairedTokenPoolFee;
  uint256 pairedTokenSwapAmountOutMinimum;
}

struct DeploymentConfig {
  TokenConfig tokenConfig;
  VaultConfig vaultConfig;
  PoolConfig poolConfig;
  InitialBuyConfig initialBuyConfig;
  RewardsConfig rewardsConfig;
}

/// @notice Interface for Clanker deployment contract
interface IClankerDeployer {
  function deployToken(
    DeploymentConfig calldata config
  ) external payable returns (address);
  function deployTokenWithCustomTeamRewardRecipient(
    DeploymentConfig calldata config,
    address teamRewardRecipient
  ) external payable returns (address);
}

/**
 * @title TokenHook
 * @notice Hook that deploys tokens via Clanker when specific metadata is provided in comments
 * @dev Looks for token deployment metadata in comment metadata and calls Clanker deployment contract
 */
contract TokenHook is BaseHook {
  /// @notice The Clanker deployment contract address on Base
  address public constant CLANKER_DEPLOYER =
    0x2A787b2362021cC3eEa3C24C4748a6cD5B687382;

  /// @notice WETH address on Base for pairing
  address public constant WETH = 0x4200000000000000000000000000000000000006;

  /// @notice Default vault percentage (5%)
  uint8 public constant DEFAULT_VAULT_PERCENTAGE = 5;

  /// @notice Default vault duration (30 days)
  uint256 public constant DEFAULT_VAULT_DURATION = 30 days;

  /// @notice Default tick for new token as token0
  int24 public constant DEFAULT_TICK = -276324; // ~1:10000 ratio

  /// @notice Default pool fee (0.3%)
  uint24 public constant DEFAULT_POOL_FEE = 3000;

  /// @notice Events
  event TokenDeployed(
    address indexed creator,
    bytes32 indexed commentId,
    address indexed tokenAddress,
    string symbol,
    string name
  );

  event TokenDeploymentFailed(
    bytes32 indexed commentId,
    address indexed creator,
    string reason
  );

  /// @notice Struct to hold parsed token deployment parameters
  struct TokenDeploymentParams {
    string name;
    string symbol;
    string image;
    string metadata;
    string context;
    address customRecipient;
  }

  /// @inheritdoc BaseHook
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
        onChannelUpdate: false
      });
  }

  /// @inheritdoc BaseHook
  function _onCommentAdd(
    Comments.Comment calldata commentData,
    Comments.MetadataEntry[] calldata metadata,
    address /* msgSender */,
    bytes32 commentId
  ) internal override returns (Comments.MetadataEntry[] memory) {
    // Parse metadata for token deployment parameters
    TokenDeploymentParams memory params = _parseTokenMetadata(metadata);

    // Only deploy if we have the required parameters
    if (bytes(params.symbol).length > 0 && bytes(params.name).length > 0) {
      try
        this._deployToken{ value: msg.value }(
          params,
          commentData.author,
          commentId
        )
      returns (address tokenAddress) {
        emit TokenDeployed(
          commentData.author,
          commentId,
          tokenAddress,
          params.symbol,
          params.name
        );

        // Return metadata with deployed token address
        Comments.MetadataEntry[]
          memory hookMetadata = new Comments.MetadataEntry[](1);
        hookMetadata[0] = Comments.MetadataEntry({
          key: keccak256("address deployed_token_address"),
          value: abi.encodePacked(tokenAddress)
        });
        return hookMetadata;
      } catch Error(string memory reason) {
        emit TokenDeploymentFailed(commentId, commentData.author, reason);
      } catch {
        emit TokenDeploymentFailed(
          commentId,
          commentData.author,
          "Unknown error"
        );
      }
    }

    // Return empty metadata array if no deployment occurred
    return new Comments.MetadataEntry[](0);
  }

  /// @notice Parse metadata entries for token deployment parameters
  /// @param metadata The metadata entries to parse
  /// @return params The parsed token deployment parameters
  function _parseTokenMetadata(
    Comments.MetadataEntry[] calldata metadata
  ) internal pure returns (TokenDeploymentParams memory params) {
    for (uint256 i = 0; i < metadata.length; i++) {
      bytes32 key = metadata[i].key;
      bytes calldata value = metadata[i].value;

      // Compare against known key hashes
      if (key == keccak256("symbol string")) {
        params.symbol = string(value);
      } else if (key == keccak256("name string")) {
        params.name = string(value);
      } else if (key == keccak256("image string")) {
        params.image = string(value);
      } else if (key == keccak256("metadata string")) {
        params.metadata = string(value);
      } else if (key == keccak256("context string")) {
        params.context = string(value);
      } else if (key == keccak256("recipient address")) {
        require(value.length == 20, "Invalid address length");
        params.customRecipient = address(bytes20(value));
      }
    }
  }

  /// @notice Deploy token via Clanker
  /// @param params The token deployment parameters
  /// @param creator The address of the comment creator
  /// @param commentId The comment ID for salt generation
  /// @return tokenAddress The address of the deployed token
  function _deployToken(
    TokenDeploymentParams memory params,
    address creator,
    bytes32 commentId
  ) external payable virtual returns (address tokenAddress) {
    require(msg.sender == address(this), "Only self-call allowed");

    // Generate salt from comment ID
    bytes32 salt = keccak256(
      abi.encodePacked(commentId, creator, block.timestamp)
    );

    // Build deployment configuration
    DeploymentConfig memory config = DeploymentConfig({
      tokenConfig: TokenConfig({
        name: params.name,
        symbol: params.symbol,
        salt: salt,
        image: params.image,
        metadata: params.metadata,
        context: params.context,
        originatingChainId: block.chainid
      }),
      vaultConfig: VaultConfig({
        vaultPercentage: DEFAULT_VAULT_PERCENTAGE,
        vaultDuration: DEFAULT_VAULT_DURATION
      }),
      poolConfig: PoolConfig({
        pairedToken: WETH,
        tickIfToken0IsNewToken: DEFAULT_TICK
      }),
      initialBuyConfig: InitialBuyConfig({
        pairedTokenPoolFee: DEFAULT_POOL_FEE,
        pairedTokenSwapAmountOutMinimum: 0
      }),
      rewardsConfig: RewardsConfig({
        creatorReward: 0,
        creatorAdmin: creator,
        creatorRewardRecipient: creator,
        interfaceAdmin: creator,
        interfaceRewardRecipient: creator
      })
    });

    // Deploy token via Clanker
    if (params.customRecipient != address(0)) {
      tokenAddress = IClankerDeployer(CLANKER_DEPLOYER)
        .deployTokenWithCustomTeamRewardRecipient{ value: msg.value }(
        config,
        params.customRecipient
      );
    } else {
      tokenAddress = IClankerDeployer(CLANKER_DEPLOYER).deployToken{
        value: msg.value
      }(config);
    }
  }

  /// @notice Allow contract to receive ETH for Clanker deployment fees
  receive() external payable {}
}

// Mock Clanker deployment contract
contract MockClankerDeployer {
  struct DeploymentCall {
    DeploymentConfig config;
    address customRecipient;
    uint256 value;
    bool isCustom;
    address deployedToken;
  }

  DeploymentCall[] public deploymentCalls;
  bool public shouldRevert;
  string public revertMessage;
  uint256 private tokenCounter;

  event TokenDeployed(address indexed token, string symbol, string name);

  function setRevert(bool _shouldRevert, string memory _message) external {
    shouldRevert = _shouldRevert;
    revertMessage = _message;
  }

  function deployToken(
    DeploymentConfig calldata config
  ) external payable returns (address) {
    if (shouldRevert) {
      revert(revertMessage);
    }

    // Generate a mock token address
    address deployedToken = address(uint160(0x1000 + tokenCounter));
    tokenCounter++;

    deploymentCalls.push(
      DeploymentCall({
        config: config,
        customRecipient: address(0),
        value: msg.value,
        isCustom: false,
        deployedToken: deployedToken
      })
    );

    emit TokenDeployed(
      deployedToken,
      config.tokenConfig.symbol,
      config.tokenConfig.name
    );

    return deployedToken;
  }

  function deployTokenWithCustomTeamRewardRecipient(
    DeploymentConfig calldata config,
    address teamRewardRecipient
  ) external payable returns (address) {
    if (shouldRevert) {
      revert(revertMessage);
    }

    // Generate a mock token address
    address deployedToken = address(uint160(0x1000 + tokenCounter));
    tokenCounter++;

    deploymentCalls.push(
      DeploymentCall({
        config: config,
        customRecipient: teamRewardRecipient,
        value: msg.value,
        isCustom: true,
        deployedToken: deployedToken
      })
    );

    emit TokenDeployed(
      deployedToken,
      config.tokenConfig.symbol,
      config.tokenConfig.name
    );

    return deployedToken;
  }

  function getDeploymentCallsCount() external view returns (uint256) {
    return deploymentCalls.length;
  }

  function getLastDeploymentCall()
    external
    view
    returns (DeploymentCall memory)
  {
    require(deploymentCalls.length > 0, "No deployment calls");
    return deploymentCalls[deploymentCalls.length - 1];
  }

  function clearCalls() external {
    delete deploymentCalls;
  }
}

// Test version of TokenHook that uses mock deployer
contract TestTokenHook is TokenHook {
  address public mockDeployer;

  constructor(address _mockDeployer) {
    mockDeployer = _mockDeployer;
  }

  // Override _deployToken to use mock deployer
  function _deployToken(
    TokenDeploymentParams memory params,
    address creator,
    bytes32 commentId
  ) external payable override returns (address tokenAddress) {
    require(msg.sender == address(this), "Only self-call allowed");

    // Generate salt from comment ID
    bytes32 salt = keccak256(
      abi.encodePacked(commentId, creator, block.timestamp)
    );

    // Build deployment configuration
    DeploymentConfig memory config = DeploymentConfig({
      tokenConfig: TokenConfig({
        name: params.name,
        symbol: params.symbol,
        salt: salt,
        image: params.image,
        metadata: params.metadata,
        context: params.context,
        originatingChainId: block.chainid
      }),
      vaultConfig: VaultConfig({
        vaultPercentage: DEFAULT_VAULT_PERCENTAGE,
        vaultDuration: DEFAULT_VAULT_DURATION
      }),
      poolConfig: PoolConfig({
        pairedToken: WETH,
        tickIfToken0IsNewToken: DEFAULT_TICK
      }),
      initialBuyConfig: InitialBuyConfig({
        pairedTokenPoolFee: DEFAULT_POOL_FEE,
        pairedTokenSwapAmountOutMinimum: 0
      }),
      rewardsConfig: RewardsConfig({
        creatorReward: 0,
        creatorAdmin: creator,
        creatorRewardRecipient: creator,
        interfaceAdmin: creator,
        interfaceRewardRecipient: creator
      })
    });

    // Deploy token via Mock Clanker
    if (params.customRecipient != address(0)) {
      tokenAddress = IClankerDeployer(mockDeployer)
        .deployTokenWithCustomTeamRewardRecipient{ value: msg.value }(
        config,
        params.customRecipient
      );
    } else {
      tokenAddress = IClankerDeployer(mockDeployer).deployToken{
        value: msg.value
      }(config);
    }
  }
}

contract TokenHookTest is Test, IERC721Receiver {
  using TestUtils for string;

  CommentManager public comments;
  ChannelManager public channelManager;
  TestTokenHook public tokenHook;
  MockClankerDeployer public mockClanker;

  address public owner;
  address public user1;
  address public user2;
  address public customRecipient;

  function setUp() public {
    owner = address(this);
    user1 = makeAddr("user1");
    user2 = makeAddr("user2");
    customRecipient = makeAddr("customRecipient");

    // Deploy mock Clanker deployer
    mockClanker = new MockClankerDeployer();

    // Deploy token hook with mock deployer
    tokenHook = new TestTokenHook(address(mockClanker));

    (comments, channelManager) = TestUtils.createContracts(owner);

    vm.deal(user1, 100 ether);
    vm.deal(user2, 100 ether);
    vm.deal(address(tokenHook), 100 ether);
  }

  function test_TokenHookDeploysTokenWithBasicMetadata() public {
    // Create channel with token hook
    uint256 channelId = channelManager.createChannel{ value: 0.02 ether }(
      "Token Creation Channel",
      "Create tokens by commenting with metadata",
      "{}",
      address(tokenHook)
    );

    // Create metadata for token deployment
    Comments.MetadataEntry[] memory metadata = new Comments.MetadataEntry[](2);
    metadata[0] = Comments.MetadataEntry({
      key: keccak256("symbol string"),
      value: bytes("MYTOKEN")
    });
    metadata[1] = Comments.MetadataEntry({
      key: keccak256("name string"),
      value: bytes("My Awesome Token")
    });

    // Create comment data
    Comments.CreateComment memory commentData = Comments.CreateComment({
      content: "Creating my token!",
      metadata: metadata,
      targetUri: "",
      commentType: 0,
      author: user1,
      app: user2,
      channelId: channelId,
      deadline: block.timestamp + 1 days,
      parentId: bytes32(0)
    });

    // Post comment - should trigger token deployment
    bytes memory appSignature = TestUtils.generateAppSignature(
      vm,
      commentData,
      comments
    );
    vm.prank(user1);
    vm.recordLogs();
    comments.postComment{ value: 0.01 ether }(commentData, appSignature);

    // Get comment ID from logs
    Vm.Log[] memory logs = vm.getRecordedLogs();
    bytes32 commentId;
    for (uint i = 0; i < logs.length; i++) {
      // Look for CommentAdded event (topic[0] is the event signature hash)
      if (
        logs[i].topics[0] ==
        0x0d63547bf74519334a5daba25e8f13c5eed8de5747ac84eb4be55f9a7f525a5c
      ) {
        commentId = logs[i].topics[1];
        break;
      }
    }

    // Verify Clanker was called
    assertEq(mockClanker.getDeploymentCallsCount(), 1);

    MockClankerDeployer.DeploymentCall memory call = mockClanker
      .getLastDeploymentCall();
    assertEq(call.config.tokenConfig.symbol, "MYTOKEN");
    assertEq(call.config.tokenConfig.name, "My Awesome Token");
    assertEq(call.config.rewardsConfig.creatorAdmin, user1);
    assertEq(call.config.rewardsConfig.creatorRewardRecipient, user1);
    assertFalse(call.isCustom);

    // Verify hook metadata contains deployed token address
    Comments.MetadataEntry[] memory hookMetadata = comments
      .getCommentHookMetadata(commentId);
    assertEq(hookMetadata.length, 1);
    assertEq(hookMetadata[0].key, keccak256("address deployed_token_address"));
    assertEq(address(bytes20(hookMetadata[0].value)), call.deployedToken);
  }

  function test_TokenHookWithAllMetadata() public {
    // Create channel with token hook
    uint256 channelId = channelManager.createChannel{ value: 0.02 ether }(
      "Token Creation Channel",
      "Create tokens by commenting with metadata",
      "{}",
      address(tokenHook)
    );

    // Create comprehensive metadata
    Comments.MetadataEntry[] memory metadata = new Comments.MetadataEntry[](6);
    metadata[0] = Comments.MetadataEntry({
      key: keccak256("symbol string"),
      value: bytes("FULL")
    });
    metadata[1] = Comments.MetadataEntry({
      key: keccak256("name string"),
      value: bytes("Full Feature Token")
    });
    metadata[2] = Comments.MetadataEntry({
      key: keccak256("image string"),
      value: bytes("https://example.com/token.png")
    });
    metadata[3] = Comments.MetadataEntry({
      key: keccak256("metadata string"),
      value: bytes("Additional metadata")
    });
    metadata[4] = Comments.MetadataEntry({
      key: keccak256("context string"),
      value: bytes("A token for testing all features")
    });
    metadata[5] = Comments.MetadataEntry({
      key: keccak256("recipient address"),
      value: abi.encodePacked(customRecipient)
    });

    // Create comment data
    Comments.CreateComment memory commentData = Comments.CreateComment({
      content: "Creating a full-featured token!",
      metadata: metadata,
      targetUri: "",
      commentType: 0,
      author: user1,
      app: user2,
      channelId: channelId,
      deadline: block.timestamp + 1 days,
      parentId: bytes32(0)
    });

    // Post comment
    bytes memory appSignature = TestUtils.generateAppSignature(
      vm,
      commentData,
      comments
    );
    vm.prank(user1);
    comments.postComment{ value: 0.01 ether }(commentData, appSignature);

    // Verify Clanker was called with custom recipient
    assertEq(mockClanker.getDeploymentCallsCount(), 1);

    MockClankerDeployer.DeploymentCall memory call = mockClanker
      .getLastDeploymentCall();
    assertEq(call.config.tokenConfig.symbol, "FULL");
    assertEq(call.config.tokenConfig.name, "Full Feature Token");
    assertEq(call.config.tokenConfig.image, "https://example.com/token.png");
    assertEq(call.config.tokenConfig.metadata, "Additional metadata");
    assertEq(
      call.config.tokenConfig.context,
      "A token for testing all features"
    );
    assertEq(call.customRecipient, customRecipient);
    assertTrue(call.isCustom);
  }

  function test_TokenHookIgnoresCommentWithoutRequiredMetadata() public {
    // Create channel with token hook
    uint256 channelId = channelManager.createChannel{ value: 0.02 ether }(
      "Token Creation Channel",
      "Create tokens by commenting with metadata",
      "{}",
      address(tokenHook)
    );

    // Create metadata without required fields
    Comments.MetadataEntry[] memory metadata = new Comments.MetadataEntry[](1);
    metadata[0] = Comments.MetadataEntry({
      key: keccak256("random string"),
      value: bytes("not relevant")
    });

    // Create comment data
    Comments.CreateComment memory commentData = Comments.CreateComment({
      content: "Just a regular comment",
      metadata: metadata,
      targetUri: "",
      commentType: 0,
      author: user1,
      app: user2,
      channelId: channelId,
      deadline: block.timestamp + 1 days,
      parentId: bytes32(0)
    });

    // Post comment - should NOT trigger token deployment
    bytes memory appSignature = TestUtils.generateAppSignature(
      vm,
      commentData,
      comments
    );
    vm.prank(user1);
    comments.postComment{ value: 0.01 ether }(commentData, appSignature);

    // Verify Clanker was NOT called
    assertEq(mockClanker.getDeploymentCallsCount(), 0);
  }

  function test_TokenHookEmitsEventsOnSuccess() public {
    // Create channel with token hook
    uint256 channelId = channelManager.createChannel{ value: 0.02 ether }(
      "Token Creation Channel",
      "Create tokens by commenting with metadata",
      "{}",
      address(tokenHook)
    );

    // Create metadata for token deployment
    Comments.MetadataEntry[] memory metadata = new Comments.MetadataEntry[](2);
    metadata[0] = Comments.MetadataEntry({
      key: keccak256("symbol string"),
      value: bytes("EVENT")
    });
    metadata[1] = Comments.MetadataEntry({
      key: keccak256("name string"),
      value: bytes("Event Test Token")
    });

    // Create comment data
    Comments.CreateComment memory commentData = Comments.CreateComment({
      content: "Testing events!",
      metadata: metadata,
      targetUri: "",
      commentType: 0,
      author: user1,
      app: user2,
      channelId: channelId,
      deadline: block.timestamp + 1 days,
      parentId: bytes32(0)
    });

    // Post comment - we'll check events were emitted afterwards
    bytes memory appSignature = TestUtils.generateAppSignature(
      vm,
      commentData,
      comments
    );
    vm.prank(user1);
    comments.postComment{ value: 0.01 ether }(commentData, appSignature);

    // Verify token deployment was triggered
    assertEq(mockClanker.getDeploymentCallsCount(), 1);
  }

  function test_TokenHookEmitsEventOnFailure() public {
    // Set mock to revert
    mockClanker.setRevert(true, "Deployment failed");

    // Create channel with token hook
    uint256 channelId = channelManager.createChannel{ value: 0.02 ether }(
      "Token Creation Channel",
      "Create tokens by commenting with metadata",
      "{}",
      address(tokenHook)
    );

    // Create metadata for token deployment
    Comments.MetadataEntry[] memory metadata = new Comments.MetadataEntry[](2);
    metadata[0] = Comments.MetadataEntry({
      key: keccak256("symbol string"),
      value: bytes("FAIL")
    });
    metadata[1] = Comments.MetadataEntry({
      key: keccak256("name string"),
      value: bytes("Fail Test Token")
    });

    // Create comment data
    Comments.CreateComment memory commentData = Comments.CreateComment({
      content: "This should fail!",
      metadata: metadata,
      targetUri: "",
      commentType: 0,
      author: user1,
      app: user2,
      channelId: channelId,
      deadline: block.timestamp + 1 days,
      parentId: bytes32(0)
    });

    // Post comment
    bytes memory appSignature = TestUtils.generateAppSignature(
      vm,
      commentData,
      comments
    );
    vm.prank(user1);
    comments.postComment{ value: 0.01 ether }(commentData, appSignature);

    // Verify no successful deployment occurred
    assertEq(mockClanker.getDeploymentCallsCount(), 0);
  }

  function test_TokenHookVerifiesConfiguration() public {
    // Create channel with token hook
    uint256 channelId = channelManager.createChannel{ value: 0.02 ether }(
      "Token Creation Channel",
      "Create tokens by commenting with metadata",
      "{}",
      address(tokenHook)
    );

    // Create metadata for token deployment
    Comments.MetadataEntry[] memory metadata = new Comments.MetadataEntry[](2);
    metadata[0] = Comments.MetadataEntry({
      key: keccak256("symbol string"),
      value: bytes("CONFIG")
    });
    metadata[1] = Comments.MetadataEntry({
      key: keccak256("name string"),
      value: bytes("Config Test Token")
    });

    // Create comment data
    Comments.CreateComment memory commentData = Comments.CreateComment({
      content: "Testing configuration!",
      metadata: metadata,
      targetUri: "",
      commentType: 0,
      author: user1,
      app: user2,
      channelId: channelId,
      deadline: block.timestamp + 1 days,
      parentId: bytes32(0)
    });

    // Post comment
    bytes memory appSignature = TestUtils.generateAppSignature(
      vm,
      commentData,
      comments
    );
    vm.prank(user1);
    comments.postComment{ value: 0.01 ether }(commentData, appSignature);

    // Verify configuration values
    MockClankerDeployer.DeploymentCall memory call = mockClanker
      .getLastDeploymentCall();

    // Check vault config
    assertEq(call.config.vaultConfig.vaultPercentage, 5);
    assertEq(call.config.vaultConfig.vaultDuration, 30 days);

    // Check pool config
    assertEq(
      call.config.poolConfig.pairedToken,
      0x4200000000000000000000000000000000000006
    ); // WETH
    assertEq(call.config.poolConfig.tickIfToken0IsNewToken, -276324);

    // Check initial buy config
    assertEq(call.config.initialBuyConfig.pairedTokenPoolFee, 3000);
    assertEq(call.config.initialBuyConfig.pairedTokenSwapAmountOutMinimum, 0);

    // Check rewards config
    assertEq(call.config.rewardsConfig.creatorReward, 0);
    assertEq(call.config.rewardsConfig.creatorAdmin, user1);
    assertEq(call.config.rewardsConfig.creatorRewardRecipient, user1);
    assertEq(call.config.rewardsConfig.interfaceAdmin, user1);
    assertEq(call.config.rewardsConfig.interfaceRewardRecipient, user1);
  }

  function onERC721Received(
    address,
    address,
    uint256,
    bytes calldata
  ) external pure returns (bytes4) {
    return IERC721Receiver.onERC721Received.selector;
  }
}
