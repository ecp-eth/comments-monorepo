# @ecp.eth/sdk

## 0.0.34

### Patch Changes

- ac7f843: feat(sdk): improve webhook error messages

## 0.0.33

### Patch Changes

- 15c2cd6: feat(sdk): export all webhook events

## 0.0.32

### Patch Changes

- fbeaca3: fix(sdk): add missing targetUri and parentId properties to comment added event
- 7586ba2: feat: zod v4 support + all events schemas

## 0.0.31

### Patch Changes

- 47366bb: feat(sdk): add createEstimateChannelPostOrEditCommentFeeData to help with fee estimation data creation
- 877a63f: feat: add reply counts to replies page info

## 0.0.30

### Patch Changes

- 315c2ee: fix(sdk): do not allow to encode decimals, improve docs
- ee07e8f: fix(sdk): createCommentData was in wrong unit
- 61c837b: chore(sdk): improve metadata helpers docs
- a650552: fix(sdk): do not retry unretriable responses from indexer API
- 90ef422: feat: notifications api helpers

## 0.0.29

### Patch Changes

- 944211a: fix(sdk): temporarily added a schema fix to avoid crashing on opengraph image schema error

## 0.0.28

### Patch Changes

- c747e78: feat(sdk): add helpers for channel/hook fee estimation

## 0.0.27

### Patch Changes

- 4f09abc: Add `app` as configurable option to iframe embed config
- db31c4c: feat(sdk): add `getCommentCreationFee` and `setCommentCreationFee` to sdk

## 0.0.26

### Patch Changes

- fe879cc: fix(sdk): export correct addresses in SUPPORTED_CHAINS in local dev
- 10cc538: feat(sdk): add api to retrieve single comment from indexer
- bec2b78: feat(sdk): add isDeleted and isReplyDeleted filter to `fetchComment()`, `fetchComments()`, `fetchCommentReplies()`
- aa089a7: fix(sdk): export IndexerAPICommentReactionSchema

## 0.0.25

### Patch Changes

- 4930d66: fix(sdk): use strict event typing
- bbed557: fix(indexer): allow empty strings in 0x swap "to" data

## 0.0.24

### Patch Changes

- 9ba157e: chore(sdk): output default chain id constants

## 0.0.23

### Patch Changes

- 1a07eea: feat: moderation content classification
- 031b30c: fix(sdk): default embed to base mainnet
- 74cc5ec: chore: remove effect dependency

## 0.0.22

### Patch Changes

- 08b79a5: feat: add autocomplete endpoint
- 2d0a2e5: feat: add support to reactions
- 2119f39: chore(sdk): export CommentType schema
- 3d71868: feat: filter channels, comments, approvals by chain ids

## 0.0.21

### Patch Changes

- 0853483: add base mainnet

## 0.0.20

### Patch Changes

- f6bdd0a: fix(sdk): coerce string to bigint
- 35c9cc3: feat(indexer): index channel ownership and allow to list by owner
  feat(sdk): allow to list channels by owner

## 0.0.19

### Patch Changes

- 46c875f: new contracts

## 0.0.18

### Patch Changes

- c264d23: chore(sdk): export AuthorAuthMethod as enum

## 0.0.17

### Patch Changes

- e49a6dd: feat(sdk): updated contract

## 0.0.16

### Patch Changes

- ea722dd: feat: channels indexing + api

## 0.0.15

### Patch Changes

- df82ffe: feat: support URI() as targetUri
- 3cd058f: chore: revert back to use nonce for add comment
- 42ae8ef: feat: add channel, hook and key-value based metadata
- aba0192: feat: add flat replies mode to comments list api
- 4cfae7d: feat: support for ecp promotion toggling
- 1684dfd: feat: add chain id config to embeds

## 0.0.13

### Patch Changes

- 182ff52: chore: re-release with proxy packages

## 0.0.12

### Patch Changes

- c4ddf43: chore: re-release with proxy package

## 0.0.11

### Patch Changes

- 0a161a5: chore: release both cjs and esm modules

## 0.0.10

### Patch Changes

- e4f0a84: feat: account-edit-link color
- edc87c0: feat: cursor pagination
- 5da9aa5: feat: helpers to create embed URL without the react components
- edc87c0: fix: pass sort option when fetching comment replies
- edc87c0: feat: add a way to pass variables to useGaslessTransaction() hook

## 0.0.9

### Patch Changes

- 3d1276e: feat: updated useGaslessTransaction in sdk to generic class to make it typed better (infer types from input)
- dd294a6: feat: add api helper to fetch comment author data

## 0.0.8

### Patch Changes

- 776e987: chore: add script to ensure it was built before publish

## 0.0.7

### Patch Changes

- 77887bc: feat: automatically resize comments embed
- cdddd5e: feat: CommentsByAuthorEmbed component
- f01b566: fix: make apiUrl optional in fetch comment helpers
- 5723754: fix: scrollHeight should be set on iframe

  1. this allows us to avoid height: 100%, the container height grows as iframe height grows anyway
  2. this allows the user to add padding between iframe and container while still having no scrollbar inside comment section
  3. also avoid overriding iframe style due to user passing an iframeProps that contains `style`

- 38834f9: feat(sdk): rename nonce to salt for comment data
- 5027a76: feat: add support for transparent color to color schema
- 38834f9: feat(sdk): calldata suffix helpers
- 0bb52df: feat: allow specify padding for top most element inside embed
- 59c0c96: fix: CommentsEmbd shrinking horizontally
- 2b50f53: feat(sdk): add zod schemas for typed data helpers
- 6900847: feat: font theming

## 0.0.6

### Patch Changes

- d916603: feat: pull comments and replies from indexer directly

## 0.0.5

### Patch Changes

- ee4dcf3: refactor: renamed typed data related util functions for consistency

## 0.0.4

### Patch Changes

- 7801830: feat: support app scoped nonces

## 0.0.3

### Patch Changes

- a981998: feat: refactor helpers from demo into sdk

## 0.0.2

### Patch Changes

- 115c516: feat: export abi

## 0.0.1

### Patch Changes

- 439c98f: feat: sdk to fetch,post,delete comments using comments protocol
