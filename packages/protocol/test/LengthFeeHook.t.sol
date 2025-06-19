// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Test } from "forge-std/Test.sol";
import { ChannelManager } from "../src/ChannelManager.sol";
import { CommentManager } from "../src/CommentManager.sol";
import { IChannelManager } from "../src/interfaces/IChannelManager.sol";
import {
  IERC721Receiver
} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {
  SafeERC20
} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { TestUtils } from "./utils.sol";
import { BaseHook } from "../src/hooks/BaseHook.sol";
import { Hooks } from "../src/types/Hooks.sol";
import { Comments } from "../src/types/Comments.sol";
import { Metadata } from "../src/types/Metadata.sol";

// Fee charging hook contract based on comment length
contract LengthFeeHook is BaseHook {
  using SafeERC20 for IERC20;

  // Token used for fee payment
  IERC20 public immutable paymentToken;
  IChannelManager public immutable channelManager;

  // Fee configuration
  uint256 public tokensPerCharacter; // Number of tokens (in smallest unit) per character
  uint256 public constant PROTOCOL_FEE_PERCENTAGE = 1000; // 10%

  address public feeCollector;
  uint256 public totalFeesCollected;

  event FeeCollected(address indexed author, uint256 amount);
  event FeeWithdrawn(address indexed collector, uint256 amount);
  event TokensPerCharacterUpdated(uint256 newAmount);

  constructor(
    address _feeCollector,
    address _paymentToken,
    uint256 _tokensPerCharacter,
    address _channelManager
  ) {
    require(_feeCollector != address(0), "Invalid fee collector");
    require(_paymentToken != address(0), "Invalid token address");
    require(_channelManager != address(0), "Invalid channel manager");
    require(_tokensPerCharacter > 0, "Invalid tokens per character");

    feeCollector = _feeCollector;
    paymentToken = IERC20(_paymentToken);
    tokensPerCharacter = _tokensPerCharacter;
    channelManager = IChannelManager(_channelManager);
  }

  function _onCommentAdd(
    Comments.Comment calldata commentData,
    Metadata.MetadataEntry[] calldata,
    address,
    bytes32
  ) internal override returns (Metadata.MetadataEntry[] memory) {
    // Calculate fee based on content length
    uint256 contentLength = bytes(commentData.content).length;
    uint256 totalFee = contentLength * tokensPerCharacter;

    // Calculate protocol fee
    uint256 protocolFee = (totalFee * PROTOCOL_FEE_PERCENTAGE) / 10000;
    uint256 hookFee = totalFee - protocolFee;

    // Transfer tokens from author
    paymentToken.safeTransferFrom(commentData.author, address(this), hookFee);
    paymentToken.safeTransferFrom(
      commentData.author,
      address(channelManager),
      protocolFee
    );

    totalFeesCollected += hookFee;
    emit FeeCollected(commentData.author, hookFee);

    return new Metadata.MetadataEntry[](0);
  }

  function withdrawFees() external {
    require(msg.sender == feeCollector, "Only fee collector");
    require(totalFeesCollected > 0, "No fees to withdraw");

    uint256 amount = totalFeesCollected;
    totalFeesCollected = 0;

    paymentToken.safeTransfer(feeCollector, amount);
    emit FeeWithdrawn(feeCollector, amount);
  }

  function updateTokensPerCharacter(uint256 _tokensPerCharacter) external {
    require(msg.sender == feeCollector, "Only fee collector");
    require(_tokensPerCharacter > 0, "Invalid tokens per character");
    tokensPerCharacter = _tokensPerCharacter;
    emit TokensPerCharacterUpdated(_tokensPerCharacter);
  }

  // Allow receiving ETH in case it's sent by mistake
  receive() external payable {}

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
}

// Mock ERC20 token for testing
contract MockERC20 is IERC20 {
  mapping(address => uint256) private _balances;
  mapping(address => mapping(address => uint256)) private _allowances;
  uint256 private _totalSupply;
  string private _name;
  string private _symbol;

  constructor(string memory name_, string memory symbol_) {
    _name = name_;
    _symbol = symbol_;
  }

  function name() public view returns (string memory) {
    return _name;
  }

  function symbol() public view returns (string memory) {
    return _symbol;
  }

  function decimals() public pure returns (uint8) {
    return 18;
  }

  function totalSupply() public view override returns (uint256) {
    return _totalSupply;
  }

  function balanceOf(address account) public view override returns (uint256) {
    return _balances[account];
  }

  function transfer(address to, uint256 amount) public override returns (bool) {
    address owner = msg.sender;
    _transfer(owner, to, amount);
    return true;
  }

  function allowance(
    address owner,
    address spender
  ) public view override returns (uint256) {
    return _allowances[owner][spender];
  }

  function approve(
    address spender,
    uint256 amount
  ) public override returns (bool) {
    address owner = msg.sender;
    _approve(owner, spender, amount);
    return true;
  }

  function transferFrom(
    address from,
    address to,
    uint256 amount
  ) public override returns (bool) {
    address spender = msg.sender;
    _spendAllowance(from, spender, amount);
    _transfer(from, to, amount);
    return true;
  }

  function mint(address to, uint256 amount) public {
    _mint(to, amount);
  }

  function _transfer(address from, address to, uint256 amount) internal {
    require(from != address(0), "ERC20: transfer from the zero address");
    require(to != address(0), "ERC20: transfer to the zero address");

    uint256 fromBalance = _balances[from];
    require(fromBalance >= amount, "ERC20: transfer amount exceeds balance");
    unchecked {
      _balances[from] = fromBalance - amount;
      _balances[to] += amount;
    }
  }

  function _mint(address account, uint256 amount) internal {
    require(account != address(0), "ERC20: mint to the zero address");

    _totalSupply += amount;
    unchecked {
      _balances[account] += amount;
    }
  }

  function _approve(address owner, address spender, uint256 amount) internal {
    require(owner != address(0), "ERC20: approve from the zero address");
    require(spender != address(0), "ERC20: approve to the zero address");

    _allowances[owner][spender] = amount;
  }

  function _spendAllowance(
    address owner,
    address spender,
    uint256 amount
  ) internal {
    uint256 currentAllowance = allowance(owner, spender);
    if (currentAllowance != type(uint256).max) {
      require(currentAllowance >= amount, "ERC20: insufficient allowance");
      unchecked {
        _approve(owner, spender, currentAllowance - amount);
      }
    }
  }
}

contract LengthFeeHookTest is Test, IERC721Receiver {
  using TestUtils for string;

  ChannelManager public channelManager;
  LengthFeeHook public feeHook;
  CommentManager public comments;
  MockERC20 public paymentToken;
  address public commentsContract;

  address public owner;
  address public user1;
  address public user2;
  address public feeCollector;

  uint256 user1PrivateKey;
  uint256 user2PrivateKey;

  // Protocol fee is 10% by default
  uint256 constant PROTOCOL_FEE_PERCENTAGE = 1000; // 10%
  uint256 constant TOKENS_PER_CHARACTER = 1e16; // 0.01 tokens per character
  uint256 constant INITIAL_TOKEN_BALANCE = 1000e18; // 1000 tokens

  event FeeCollected(address indexed author, uint256 amount);
  event FeeWithdrawn(address indexed collector, uint256 amount);

  function setUp() public {
    owner = address(this);
    (user1, user1PrivateKey) = makeAddrAndKey("user1");
    (user2, user2PrivateKey) = makeAddrAndKey("user2");
    feeCollector = makeAddr("feeCollector");

    // Deploy mock token
    paymentToken = new MockERC20("Test Token", "TEST");

    (comments, channelManager) = TestUtils.createContracts(owner);

    // Deploy fee hook with correct channelManager address
    feeHook = new LengthFeeHook(
      feeCollector,
      address(paymentToken),
      TOKENS_PER_CHARACTER,
      address(channelManager)
    );

    // Setup token balances and approvals
    paymentToken.mint(user1, INITIAL_TOKEN_BALANCE);
    paymentToken.mint(user2, INITIAL_TOKEN_BALANCE);
    vm.prank(user1);
    paymentToken.approve(address(feeHook), type(uint256).max);
    vm.prank(user2);
    paymentToken.approve(address(feeHook), type(uint256).max);
  }

  function _signAppSignature(
    Comments.CreateComment memory commentData
  ) internal view returns (bytes memory) {
    bytes32 digest = comments.getCommentId(commentData);
    (uint8 v, bytes32 r, bytes32 s) = vm.sign(user2PrivateKey, digest);
    return abi.encodePacked(r, s, v);
  }

  function test_FeeHookCollectsCorrectTokenAmount() public {
    // Create channel with fee hook
    uint256 channelId = channelManager.createChannel{ value: 0.02 ether }(
      "Fee Channel",
      "Pay tokens per character",
      new Metadata.MetadataEntry[](0),
      address(feeHook)
    );

    string memory content = "Test comment";
    uint256 contentLength = bytes(content).length;
    uint256 expectedTotalFee = contentLength * TOKENS_PER_CHARACTER;
    uint256 expectedHookFee = expectedTotalFee -
      ((expectedTotalFee * PROTOCOL_FEE_PERCENTAGE) / 10000);

    // Create comment data using direct construction
    Comments.CreateComment memory commentData = Comments.CreateComment({
      content: content,
      metadata: new Metadata.MetadataEntry[](0),
      targetUri: "",
      commentType: 0, // COMMENT_TYPE_COMMENT
      author: user1,
      app: user2,
      channelId: channelId,
      deadline: block.timestamp + 1 days,
      parentId: bytes32(0)
    });

    bytes memory appSignature = _signAppSignature(commentData);

    uint256 hookBalanceBefore = paymentToken.balanceOf(address(feeHook));
    uint256 user1BalanceBefore = paymentToken.balanceOf(user1);

    // Post comment as user1
    vm.prank(user1);
    comments.postComment(commentData, appSignature);

    // Check that the hook received the correct token amount
    assertEq(
      paymentToken.balanceOf(address(feeHook)) - hookBalanceBefore,
      expectedHookFee
    );
    // Check that user1 paid the total fee
    assertEq(
      user1BalanceBefore - paymentToken.balanceOf(user1),
      expectedTotalFee
    );
    // Check that the hook recorded the fee
    assertEq(feeHook.totalFeesCollected(), expectedHookFee);
  }

  function test_FeeWithdrawal() public {
    // Create channel with fee hook
    uint256 channelId = channelManager.createChannel{ value: 0.02 ether }(
      "Fee Channel",
      "Pay tokens per character",
      new Metadata.MetadataEntry[](0),
      address(feeHook)
    );

    string memory content = "Test comment";

    // Create comment data using direct construction
    Comments.CreateComment memory commentData = Comments.CreateComment({
      content: content,
      metadata: new Metadata.MetadataEntry[](0),
      targetUri: "",
      commentType: 0, // COMMENT_TYPE_COMMENT
      author: user1,
      app: user2,
      channelId: channelId,
      deadline: block.timestamp + 1 days,
      parentId: bytes32(0)
    });

    // Make a few comments to collect fees
    for (uint i = 0; i < 3; i++) {
      bytes memory appSignature = _signAppSignature(commentData);
      vm.prank(user1);
      comments.postComment(commentData, appSignature);
    }

    uint256 feeCollectorBalanceBefore = paymentToken.balanceOf(feeCollector);
    uint256 expectedFeePerComment = ((bytes(content).length *
      TOKENS_PER_CHARACTER) * (10000 - PROTOCOL_FEE_PERCENTAGE)) / 10000;

    // Withdraw fees
    vm.prank(feeCollector);
    vm.expectEmit(true, true, false, true);
    emit FeeWithdrawn(feeCollector, expectedFeePerComment * 3);
    feeHook.withdrawFees();

    // Check balances
    assertEq(
      paymentToken.balanceOf(feeCollector) - feeCollectorBalanceBefore,
      expectedFeePerComment * 3
    );
    assertEq(paymentToken.balanceOf(address(feeHook)), 0);
    assertEq(feeHook.totalFeesCollected(), 0);
  }

  function test_OnlyFeeCollectorCanWithdraw() public {
    // Try to withdraw as non-fee collector
    vm.prank(user1);
    vm.expectRevert("Only fee collector");
    feeHook.withdrawFees();
  }

  function test_CannotWithdrawWithNoFees() public {
    vm.prank(feeCollector);
    vm.expectRevert("No fees to withdraw");
    feeHook.withdrawFees();
  }

  function test_UpdateTokensPerCharacter() public {
    uint256 newTokensPerCharacter = 2e16;

    // Try to update as non-fee collector
    vm.prank(user1);
    vm.expectRevert("Only fee collector");
    feeHook.updateTokensPerCharacter(newTokensPerCharacter);

    // Update as fee collector
    vm.prank(feeCollector);
    feeHook.updateTokensPerCharacter(newTokensPerCharacter);
    assertEq(feeHook.tokensPerCharacter(), newTokensPerCharacter);
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
