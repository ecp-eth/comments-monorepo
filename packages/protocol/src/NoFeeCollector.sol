// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IFeeCollector.sol";
import "./interfaces/ICommentTypes.sol";

/// @title NoFeeCollector - Implementation of the no-fee strategy
/// @notice A simple implementation of IFeeCollector that charges no fees
contract NoFeeCollector is IFeeCollector {
    function collectFee(
        ICommentTypes.CommentData calldata
    ) external payable override returns (bool) {
        // No fee collection logic
        return true;
    }
    
    function getFeeAmount(
        ICommentTypes.CommentData calldata
    ) external pure override returns (uint256) {
        return 0;
    }

    function getBalance(address) external pure override returns (uint256) {
        return 0;
    }

    function withdraw() external pure override returns (bool) {
        return true;
    }
} 