---
"@ecp.eth/sdk": minor
"@ecp.eth/shared": patch
"@ecp.eth/embed": patch
"@ecp.eth/docs": patch
"@ecp.eth/homepage": patch
---

feat: hook fee warning dialog and hideEmptyScreen

- Add `hookFeeWarningThresholdUsd` embed config option with a transaction warning dialog shown before opening the wallet when channel hook fees exceed the threshold.
- Add `hideEmptyScreen` embed config option to hide the empty state when there are no comments.
- Add `isUserRejectionError` helper for consistent wallet rejection detection across providers.
- Improve user rejection error handling across post, edit, delete, and react flows.
