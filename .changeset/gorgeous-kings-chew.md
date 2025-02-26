---
"@ecp.eth/sdk": patch
---

fix: scrollHeight should be set on iframe

1. this allows us to avoid height: 100%, the container height grows as iframe height grows anyway
2. this allows the user to add padding between iframe and container while still having no scrollbar inside comment section
3. also avoid overriding iframe style due to user passing an iframeProps that contains `style`
