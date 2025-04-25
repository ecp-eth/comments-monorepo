##### @ecp.eth/protocol

----

# `ProtocolFees`

This contract handles all fee-related functionality including channel creation, hook registration, and transaction fees


Implements fee management with the following features:
1. Fee Configuration:
   - Channel creation fee
   - Hook registration fee
   - Hook transaction fee percentage
2. Fee Collection:
   - Accumulates fees from various operations
   - Allows withdrawal of accumulated fees
3. Fee Updates:
   - Only owner can update fee amounts
   - Fee percentage capped at 100%







## Functions

### `constructor(address initialOwner)` (internal)

Constructor sets the contract owner and initializes fees




### `setChannelCreationFee(uint96 fee)` (external)

Sets the fee for creating a new channel (only owner)




### `setHookRegistrationFee(uint96 fee)` (external)

Sets the fee for registering a new hook (only owner)




### `setHookTransactionFee(uint16 feeBasisPoints)` (external)

Sets the fee percentage taken from hook transactions (only owner)




### `getChannelCreationFee() → uint96` (external)

Gets the current channel creation fee



### `getHookRegistrationFee() → uint96` (external)

Gets the current hook registration fee



### `getHookTransactionFee() → uint16` (external)

Gets the current hook transaction fee percentage in basis points



### `withdrawFees(address recipient) → uint256 amount` (external)

Withdraws accumulated fees to a specified address (only owner)




### `collectChannelCreationFee() → uint96` (public)

Collects channel creation fee




### `collectHookRegistrationFee() → uint96` (public)

Collects hook registration fee




### `calculateHookTransactionFee(uint256 value) → uint256 hookValue` (public)

Collects hook transaction fee




### `_collectFee(uint96 requiredFee) → uint96` (internal)

Internal function to handle fee collection and refunds






