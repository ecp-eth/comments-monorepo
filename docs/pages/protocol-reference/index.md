# Protocol Reference

## Core Contracts

- [ChannelManager](./ChannelManager.md) - NFT-based channel creation and management
- [CommentManager](./CommentManager.md) - Comment posting and management with signature verification
- [ProtocolFees](./ProtocolFees.md) - Fee management for protocol operations

## Hooks

- [BaseHook](./hooks/BaseHook.md) - Abstract base contract for hook implementations
- [NoopHook](./hooks/NoopHook.md) - No-operation hook implementation for testing

## Interfaces

### Core

- [IChannelManager](./interfaces/IChannelManager.md) - Channel management interface
- [ICommentManager](./interfaces/ICommentManager.md) - Comment management interface
- [IProtocolFees](./interfaces/IProtocolFees.md) - Protocol fee management interface
- [IFeeManager](./interfaces/IFeeManager.md) - Extended fee management interface

### Hooks

- [IHook](./interfaces/IHook.md) - Base hook interface

### Types

- [ICommentTypes](./interfaces/ICommentTypes.md) - Comment data structures
- [Comments](./libraries/Comments.md) - Comment-related types and utilities
- [Hooks](./libraries/Hooks.md) - Hook-related types and utilities
