##### @ecp.eth/protocol

----

# `Approvals`









## Events

### `ApprovalAdded(address author, address app, uint256 expiry)`

Event emitted when an author approves an app signer



### `ApprovalRemoved(address author, address app)`

Event emitted when an author removes an app signer's approval




## Functions

### addApproval(address author, address app, uint256 expiry, mapping(address => mapping(address => uint256)) approvals) (external)

Add an app signer approval




### revokeApproval(address author, address app, mapping(address => mapping(address => uint256)) approvals) (external)

Remove an app signer approval




### isApproved(address author, address app, mapping(address => mapping(address => uint256)) approvals) → bool approved (external)

Check if an app is approved for an author




### getApprovalExpiry(address author, address app, mapping(address => mapping(address => uint256)) approvals) → uint256 expiry (external)

Get approval expiry timestamp




### getNonce(address author, address app, mapping(address => mapping(address => uint256)) nonces) → uint256 nonce (external)

Get nonce for author-app pair




### incrementNonce(address author, address app, mapping(address => mapping(address => uint256)) nonces) (external)

Increment nonce for author-app pair




### validateNonce(address author, address app, uint256 expectedNonce, mapping(address => mapping(address => uint256)) nonces) (external)

Validate nonce for author-app pair






