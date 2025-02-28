// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

event Yoinked(address indexed author);

contract YoinkProtocol {
  function yoink() public {
    emit Yoinked(msg.sender);
  }
}