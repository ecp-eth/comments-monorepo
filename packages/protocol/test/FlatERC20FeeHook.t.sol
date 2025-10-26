// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Test } from "forge-std/Test.sol";
import { ChannelManager } from "../src/ChannelManager.sol";
import { CommentManager } from "../src/CommentManager.sol";
import { IChannelManager } from "../src/interfaces/IChannelManager.sol";
import { IProtocolFees } from "../src/interfaces/IProtocolFees.sol";
import {
  IERC721Receiver
} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import { Math } from "@openzeppelin/contracts/utils/math/Math.sol";
import { TestUtils } from "./utils.sol";
import { Hooks } from "../src/types/Hooks.sol";
import { Comments } from "../src/types/Comments.sol";
import { Metadata } from "../src/types/Metadata.sol";
import { FeeEstimatable } from "../src/types/FeeEstimatable.sol";
import { BaseHook } from "../src/hooks/BaseHook.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title DummyERC20
 * @dev A simple ERC20 token for testing purposes
 */
contract DummyERC20 is ERC20, Ownable {
  uint8 private _decimals = 18;

  constructor(
    string memory name,
    string memory symbol,
    address owner
  ) ERC20(name, symbol) Ownable(owner) {
    _mint(owner, 1_000 * 10 ** 18);
  }

  function decimals() public view virtual override returns (uint8) {
    return _decimals;
  }

  /**
   * @dev Mint tokens to a specific address (only owner)
   */
  function mint(address to, uint256 amount) external onlyOwner {
    _mint(to, amount);
  }

  /**
   * @dev Burn tokens from a specific address (only owner)
   */
  function burn(address from, uint256 amount) external onlyOwner {
    _burn(from, amount);
  }
}

// Fee charging hook contract
contract FlatERC20FeeHook is BaseHook, Ownable {
  uint256 public constant HOOK_FEE = 8 * 10 ** 18; // 8 tokens

  address public tokenAddress;
  DummyERC20 public token;
  bool public shouldChargeOnEdit;

  event FeeCollected(address indexed author, uint256 amount);
  event FeeWithdrawn(address indexed collector, uint256 amount);
  event RefundIssued(address indexed author, uint256 amount);

  constructor(address owner, address _tokenAddress) Ownable(owner) {
    tokenAddress = _tokenAddress;
    token = DummyERC20(tokenAddress);
    shouldChargeOnEdit = false;
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
        onCommentEdit: true,
        onChannelUpdate: false,
        onCommentHookDataUpdate: false
      });
  }

  function _onCommentAdd(
    Comments.Comment calldata commentData,
    Metadata.MetadataEntry[] calldata,
    address submitter,
    bytes32
  ) internal override returns (Metadata.MetadataEntry[] memory) {
    _collectHookFee(submitter, commentData);

    return new Metadata.MetadataEntry[](0);
  }

  function _onCommentEdit(
    Comments.Comment calldata commentData,
    Metadata.MetadataEntry[] calldata,
    address submitter,
    bytes32
  ) internal override returns (Metadata.MetadataEntry[] memory) {
    if (shouldChargeOnEdit) {
      _collectHookFee(submitter, commentData);
    }

    return new Metadata.MetadataEntry[](0);
  }

  function _collectHookFee(
    address submitter,
    Comments.Comment calldata
  ) internal {
    require(token.balanceOf(submitter) >= HOOK_FEE, "Insufficient fee");
    require(
      token.allowance(submitter, address(this)) >= HOOK_FEE,
      "Insufficient token allowance for hook"
    );

    token.transferFrom(submitter, address(this), HOOK_FEE);

    emit FeeCollected(submitter, HOOK_FEE);
  }

  function setShouldChargeOnEdit(bool _shouldChargeOnEdit) external onlyOwner {
    shouldChargeOnEdit = _shouldChargeOnEdit;
  }

  function estimateAddCommentFee(
    Comments.Comment calldata,
    Metadata.MetadataEntry[] calldata,
    address
  ) external view returns (FeeEstimatable.FeeEstimation memory feeEstimation) {
    feeEstimation.amount = HOOK_FEE;
    feeEstimation.asset = tokenAddress;
    feeEstimation.description = "Flat erc20 fee for adding a comment";
    feeEstimation.metadata = new Metadata.MetadataEntry[](0);

    return feeEstimation;
  }

  function estimateEditCommentFee(
    Comments.Comment calldata,
    Metadata.MetadataEntry[] calldata,
    address
  ) external view returns (FeeEstimatable.FeeEstimation memory feeEstimation) {
    if (shouldChargeOnEdit) {
      feeEstimation.amount = HOOK_FEE;
    } else {
      feeEstimation.amount = 0;
    }
    feeEstimation.asset = tokenAddress;
    feeEstimation.description = "Flat erc20 fee for editing a comment";
    feeEstimation.metadata = new Metadata.MetadataEntry[](0);

    return feeEstimation;
  }

  function withdrawFees() external onlyOwner {
    uint256 amount = token.balanceOf(address(this));
    address _owner = owner();
    token.transfer(_owner, amount);
    emit FeeWithdrawn(_owner, amount);
  }
}
