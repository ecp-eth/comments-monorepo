# @ecp.eth/sdk

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
