// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/ICommentManager.sol";

/// @title Approvals - Library for handling approval management
library Approvals {
  /// @notice Event emitted when an author approves an app signer
  event ApprovalAdded(
    address indexed author,
    address indexed app,
    uint256 expiry
  );

  /// @notice Event emitted when an author removes an app signer's approval
  event ApprovalRemoved(address indexed author, address indexed app);

  /// @notice Add an app signer approval
  /// @param author The address granting approval
  /// @param app The address being approved
  /// @param expiry The timestamp when the approval expires
  /// @param approvals Storage mapping for approvals
  function addApproval(
    address author,
    address app,
    uint256 expiry,
    mapping(address => mapping(address => uint256)) storage approvals
  ) external {
    if (expiry <= block.timestamp)
      revert ICommentManager.InvalidApprovalExpiry();
    approvals[author][app] = expiry;
    emit ApprovalAdded(author, app, expiry);
  }

  /// @notice Remove an app signer approval
  /// @param author The address removing approval
  /// @param app The address being unapproved
  /// @param approvals Storage mapping for approvals
  function revokeApproval(
    address author,
    address app,
    mapping(address => mapping(address => uint256)) storage approvals
  ) external {
    approvals[author][app] = 0;
    emit ApprovalRemoved(author, app);
  }

  /// @notice Check if an app is approved for an author
  /// @param author The address of the author
  /// @param app The address of the app
  /// @param approvals Storage mapping for approvals
  /// @return approved Whether the app is approved
  function isApproved(
    address author,
    address app,
    mapping(address => mapping(address => uint256)) storage approvals
  ) external view returns (bool approved) {
    return approvals[author][app] > block.timestamp;
  }

  /// @notice Get approval expiry timestamp
  /// @param author The address of the author
  /// @param app The address of the app
  /// @param approvals Storage mapping for approvals
  /// @return expiry The approval expiry timestamp
  function getApprovalExpiry(
    address author,
    address app,
    mapping(address => mapping(address => uint256)) storage approvals
  ) external view returns (uint256 expiry) {
    return approvals[author][app];
  }

  /// @notice Get nonce for author-app pair
  /// @param author The address of the author
  /// @param app The address of the app
  /// @param nonces Storage mapping for nonces
  /// @return nonce The current nonce
  function getNonce(
    address author,
    address app,
    mapping(address => mapping(address => uint256)) storage nonces
  ) external view returns (uint256 nonce) {
    return nonces[author][app];
  }

  /// @notice Increment nonce for author-app pair
  /// @param author The address of the author
  /// @param app The address of the app
  /// @param nonces Storage mapping for nonces
  function incrementNonce(
    address author,
    address app,
    mapping(address => mapping(address => uint256)) storage nonces
  ) external {
    nonces[author][app]++;
  }

  /// @notice Validate nonce for author-app pair
  /// @param author The address of the author
  /// @param app The address of the app
  /// @param expectedNonce The expected nonce value
  /// @param nonces Storage mapping for nonces
  function validateNonce(
    address author,
    address app,
    uint256 expectedNonce,
    mapping(address => mapping(address => uint256)) storage nonces
  ) external view {
    if (nonces[author][app] != expectedNonce) {
      revert ICommentManager.InvalidNonce(
        author,
        app,
        nonces[author][app],
        expectedNonce
      );
    }
  }
}
