# Agents

## Changesets

This monorepo uses [changesets](https://github.com/changesets/changesets) for versioning and publishing packages to npm.

### When to add a changeset

Add a changeset when you make a user-facing change to any **published** package. The published packages are:

- `@ecp.eth/sdk` (`packages/sdk`)
- `@ecp.eth/shared` (`packages/shared`)
- `@ecp.eth/shared-signer` (`packages/shared-signer`)
- `@ecp.eth/react-editor` (`packages/react-editor`)
- `@ecp.eth/protocol` (`packages/protocol`)

Do **not** add changesets for:
- Private packages (apps, examples, docs, internal tooling like `build-tools`, `eslint-config`, `typescript-config`, `test-protocol`)
- Changes that don't affect the published API or behavior (CI config, dev tooling, tests-only changes within a published package)

### How to add a changeset

Run `pnpm changeset` interactively, or create a markdown file manually in `.changeset/` with a random kebab-case name (e.g. `.changeset/brave-foxes-dance.md`). The format is:

```markdown
---
"@ecp.eth/sdk": patch
---

Description of the change
```

### Bump type guidance

- **patch** — bug fixes, internal refactors with no API change, dependency updates
- **minor** — new features, new exports, non-breaking additions
- **major** — breaking API changes (removed/renamed exports, changed function signatures, changed behavior that consumers rely on)

### Multiple packages

If a change spans multiple published packages, list them all in one changeset:

```markdown
---
"@ecp.eth/sdk": minor
"@ecp.eth/shared": patch
---

Add new feature X to SDK, with supporting utility in shared
```

### Internal dependency bumps

The changeset config has `"updateInternalDependencies": "patch"`, so when a dependency like `@ecp.eth/shared` is bumped, packages that depend on it (e.g. `@ecp.eth/sdk`) will automatically get a patch bump — you don't need to add a separate changeset for those downstream bumps.

### Publishing

Publishing is handled via `pnpm pkg:publish` which runs `scripts/publish.sh`. This script:
1. Checks out `main` and creates a release branch
2. Runs `pnpm changeset version` to consume changesets and bump versions
3. Runs `pnpm changeset publish` to publish to npm
4. Pushes git tags

Do not run `pnpm changeset version` or `pnpm changeset publish` directly outside of this script.
