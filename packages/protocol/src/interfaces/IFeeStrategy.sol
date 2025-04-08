// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IFeeStrategy {
    function calculateFee(
        address user,
        uint256 baseAmount,
        bytes calldata extraData
    ) external view returns (uint256 feeAmount);
} 