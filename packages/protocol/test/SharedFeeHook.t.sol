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
import { Hooks } from "../src/libraries/Hooks.sol";
import { Comments } from "../src/libraries/Comments.sol";
import { Metadata } from "../src/libraries/Metadata.sol";
/// @title SharedFeeHook - A hook that splits comment fees between channel owners and parent comment authors
/// @notice This hook charges 0.001 ETH per comment and splits it between channel owners and parent comment authors
contract SharedFeeHook is BaseHook {
  using SafeERC20 for IERC20;

  // Token used for fee payment
  IERC20 public immutable paymentToken;
  IChannelManager public immutable channelManager;

  // Fee configuration
  uint256 public feeAmount; // Fixed fee amount per comment
  uint256 public constant PROTOCOL_FEE_PERCENTAGE = 1000; // 10%

  // Fee recipients and their shares
  struct Recipient {
    address addr;
    uint256 share; // Share in basis points (1/100 of a percent)
  }

  Recipient[] public recipients;
  uint256 public totalShares;
  uint256 public totalFeesCollected;

  event FeeCollected(address indexed author, uint256 amount);
  event FeeDistributed(address indexed recipient, uint256 amount);
  event FeeAmountUpdated(uint256 newAmount);
  event RecipientAdded(address indexed recipient, uint256 share);
  event RecipientRemoved(address indexed recipient);
  event RecipientShareUpdated(address indexed recipient, uint256 newShare);

  constructor(
    address _paymentToken,
    uint256 _feeAmount,
    address _channelManager
  ) {
    require(_paymentToken != address(0), "Invalid token address");
    require(_channelManager != address(0), "Invalid channel manager");
    require(_feeAmount > 0, "Invalid fee amount");

    paymentToken = IERC20(_paymentToken);
    feeAmount = _feeAmount;
    channelManager = IChannelManager(_channelManager);
  }

  function _getHookPermissions()
    internal
    pure
    override
    returns (Hooks.Permissions memory)
  {
    return
      Hooks.Permissions({
        onCommentAdd: true,
        onCommentDelete: false,
        onCommentEdit: false,
        onInitialize: false,
        onChannelUpdate: false,
        onCommentHookDataUpdate: false
      });
  }

  function _onCommentAdd(
    Comments.Comment calldata commentData,
    Metadata.MetadataEntry[] calldata,
    address,
    bytes32
  ) internal override returns (Metadata.MetadataEntry[] memory) {
    // Calculate protocol fee
    uint256 protocolFee = (feeAmount * PROTOCOL_FEE_PERCENTAGE) / 10000;
    uint256 hookFee = feeAmount - protocolFee;

    // Transfer tokens from author
    paymentToken.safeTransferFrom(commentData.author, address(this), hookFee);
    paymentToken.safeTransferFrom(
      commentData.author,
      address(channelManager),
      protocolFee
    );

    totalFeesCollected += hookFee;
    emit FeeCollected(commentData.author, hookFee);

    // Distribute fees to recipients
    _distributeFees(hookFee);

    return new Metadata.MetadataEntry[](0);
  }

  function addRecipient(address _recipient, uint256 _share) external {
    require(_recipient != address(0), "Invalid recipient address");
    require(_share > 0, "Invalid share");

    // Check if recipient already exists
    for (uint i = 0; i < recipients.length; i++) {
      require(recipients[i].addr != _recipient, "Recipient already exists");
    }

    recipients.push(Recipient(_recipient, _share));
    totalShares += _share;

    emit RecipientAdded(_recipient, _share);
  }

  function removeRecipient(address _recipient) external {
    for (uint i = 0; i < recipients.length; i++) {
      if (recipients[i].addr == _recipient) {
        totalShares -= recipients[i].share;

        // Move the last element to the current position and pop
        recipients[i] = recipients[recipients.length - 1];
        recipients.pop();

        emit RecipientRemoved(_recipient);
        return;
      }
    }
    revert("Recipient not found");
  }

  function updateRecipientShare(
    address _recipient,
    uint256 _newShare
  ) external {
    require(_newShare > 0, "Invalid share");

    for (uint i = 0; i < recipients.length; i++) {
      if (recipients[i].addr == _recipient) {
        totalShares = totalShares - recipients[i].share + _newShare;
        recipients[i].share = _newShare;

        emit RecipientShareUpdated(_recipient, _newShare);
        return;
      }
    }
    revert("Recipient not found");
  }

  function updateFeeAmount(uint256 _newFeeAmount) external {
    require(_newFeeAmount > 0, "Invalid fee amount");
    feeAmount = _newFeeAmount;
    emit FeeAmountUpdated(_newFeeAmount);
  }

  function _distributeFees(uint256 _amount) internal {
    if (recipients.length == 0) return;

    for (uint i = 0; i < recipients.length; i++) {
      uint256 shareAmount = (_amount * recipients[i].share) / totalShares;
      if (shareAmount > 0) {
        paymentToken.safeTransfer(recipients[i].addr, shareAmount);
        emit FeeDistributed(recipients[i].addr, shareAmount);
      }
    }
  }

  // Allow receiving ETH in case it's sent by mistake
  receive() external payable {}
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

contract SharedFeeHookTest is Test, IERC721Receiver {
  using TestUtils for string;

  ChannelManager public channelManager;
  SharedFeeHook public feeHook;
  CommentManager public comments;
  MockERC20 public paymentToken;
  address public commentsContract;

  address public owner;
  address public user1;
  address public user2;
  address public recipient1;
  address public recipient2;
  address public recipient3;

  uint256 user1PrivateKey;
  uint256 user2PrivateKey;

  // Protocol fee is 10% by default
  uint256 constant PROTOCOL_FEE_PERCENTAGE = 1000; // 10%
  uint256 constant FEE_AMOUNT = 100e18; // 100 tokens per comment
  uint256 constant INITIAL_TOKEN_BALANCE = 1000e18; // 1000 tokens

  event FeeCollected(address indexed author, uint256 amount);
  event FeeDistributed(address indexed recipient, uint256 amount);

  function setUp() public {
    owner = address(this);
    (user1, user1PrivateKey) = makeAddrAndKey("user1");
    (user2, user2PrivateKey) = makeAddrAndKey("user2");
    recipient1 = makeAddr("recipient1");
    recipient2 = makeAddr("recipient2");
    recipient3 = makeAddr("recipient3");

    // Deploy mock token
    paymentToken = new MockERC20("Test Token", "TEST");

    (comments, channelManager) = TestUtils.createContracts(owner);

    // Deploy fee hook with correct channelManager address
    feeHook = new SharedFeeHook(
      address(paymentToken),
      FEE_AMOUNT,
      address(channelManager)
    );

    // Setup token balances and approvals
    paymentToken.mint(user1, INITIAL_TOKEN_BALANCE);
    paymentToken.mint(user2, INITIAL_TOKEN_BALANCE);
    vm.prank(user1);
    paymentToken.approve(address(feeHook), type(uint256).max);
    vm.prank(user2);
    paymentToken.approve(address(feeHook), type(uint256).max);

    // Add recipients with different shares
    feeHook.addRecipient(recipient1, 5000); // 50%
    feeHook.addRecipient(recipient2, 3000); // 30%
    feeHook.addRecipient(recipient3, 2000); // 20%
  }

  function _signAppSignature(
    Comments.CreateComment memory commentData
  ) internal view returns (bytes memory) {
    bytes32 digest = comments.getCommentId(commentData);
    (uint8 v, bytes32 r, bytes32 s) = vm.sign(user2PrivateKey, digest);
    return abi.encodePacked(r, s, v);
  }

  function test_FeeHookCollectsAndDistributesCorrectly() public {
    // Create channel with fee hook
    uint256 channelId = channelManager.createChannel{ value: 0.02 ether }(
      "Fee Channel",
      "Pay tokens to comment",
      new Metadata.MetadataEntry[](0),
      address(feeHook)
    );

    // Create comment data using direct construction
    Comments.CreateComment memory commentData = Comments.CreateComment({
      content: "Test comment",
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
    uint256 recipient1BalanceBefore = paymentToken.balanceOf(recipient1);
    uint256 recipient2BalanceBefore = paymentToken.balanceOf(recipient2);
    uint256 recipient3BalanceBefore = paymentToken.balanceOf(recipient3);

    // Post comment as user1
    vm.prank(user1);
    comments.postComment(commentData, appSignature);

    // Calculate expected fees
    uint256 expectedHookFee = FEE_AMOUNT -
      ((FEE_AMOUNT * PROTOCOL_FEE_PERCENTAGE) / 10000);
    uint256 expectedRecipient1Share = (expectedHookFee * 5000) / 10000;
    uint256 expectedRecipient2Share = (expectedHookFee * 3000) / 10000;
    uint256 expectedRecipient3Share = (expectedHookFee * 2000) / 10000;

    // Check that the hook received the correct token amount
    assertEq(paymentToken.balanceOf(address(feeHook)) - hookBalanceBefore, 0); // Should be 0 as fees are distributed immediately
    // Check that user1 paid the total fee
    assertEq(user1BalanceBefore - paymentToken.balanceOf(user1), FEE_AMOUNT);
    // Check that recipients received their shares
    assertEq(
      paymentToken.balanceOf(recipient1) - recipient1BalanceBefore,
      expectedRecipient1Share
    );
    assertEq(
      paymentToken.balanceOf(recipient2) - recipient2BalanceBefore,
      expectedRecipient2Share
    );
    assertEq(
      paymentToken.balanceOf(recipient3) - recipient3BalanceBefore,
      expectedRecipient3Share
    );
  }

  function test_AddAndRemoveRecipients() public {
    address newRecipient = makeAddr("newRecipient");

    // Add a new recipient
    feeHook.addRecipient(newRecipient, 1000); // 10%

    // Check that the recipient was added
    (address addr, uint256 share) = feeHook.recipients(3);
    assertEq(addr, newRecipient);
    assertEq(share, 1000);
    assertEq(feeHook.totalShares(), 11000); // 5000 + 3000 + 2000 + 1000

    // Remove a recipient
    feeHook.removeRecipient(recipient2);

    // Check that the recipient was removed
    (addr, share) = feeHook.recipients(1);
    assertEq(addr, newRecipient); // The newRecipient should be at position 1 after removing recipient2
    assertEq(feeHook.totalShares(), 8000); // 5000 + 2000 + 1000
  }

  function test_UpdateRecipientShare() public {
    // Update recipient share
    feeHook.updateRecipientShare(recipient1, 6000); // Change from 50% to 60%

    // Check that the share was updated
    (address addr, uint256 share) = feeHook.recipients(0);
    assertEq(addr, recipient1);
    assertEq(share, 6000);
    assertEq(feeHook.totalShares(), 11000); // 6000 + 3000 + 2000
  }

  function test_UpdateFeeAmount() public {
    uint256 newFeeAmount = 200e18; // 200 tokens per comment

    // Update fee amount
    feeHook.updateFeeAmount(newFeeAmount);

    // Check that the fee amount was updated
    assertEq(feeHook.feeAmount(), newFeeAmount);
  }

  function test_RevertWhen_AddingDuplicateRecipient() public {
    vm.expectRevert("Recipient already exists");
    feeHook.addRecipient(recipient1, 1000);
  }

  function test_RevertWhen_RemovingNonExistentRecipient() public {
    address nonExistentRecipient = makeAddr("nonExistent");
    vm.expectRevert("Recipient not found");
    feeHook.removeRecipient(nonExistentRecipient);
  }

  function test_RevertWhen_UpdatingNonExistentRecipient() public {
    address nonExistentRecipient = makeAddr("nonExistent");
    vm.expectRevert("Recipient not found");
    feeHook.updateRecipientShare(nonExistentRecipient, 1000);
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
