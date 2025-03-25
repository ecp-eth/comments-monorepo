// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
 
contract BatchCallDelegationProtocol {
  struct Call {
    bytes data;
    address to;
    uint256 value;
  }
 
  function execute(Call[] calldata calls) external payable {
    for (uint256 i = 0; i < calls.length; i++) {
      Call memory call = calls[i];
      (bool success, bytes memory result) = call.to.call{value: call.value}(call.data);

      if (!success) {
        // If the result length is less than 68, then the transaction failed silently
        if (result.length < 4) {
          revert(string(abi.encodePacked("Call ", i, " reverted without reason")));
        }
        assembly {
          // Skip the first 4 bytes of the result which contain the error signature
          result := add(result, 0x04)
        }
        revert(string(abi.encodePacked("Call ", i, " reverted: ", abi.decode(result, (string)))));
      }
    }
  }
}