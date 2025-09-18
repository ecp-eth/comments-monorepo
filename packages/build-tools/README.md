# Build Tools

This package contains internal build tools for the project.

## Tools and Scripts

Please note that all scripts and commands in this package can be executed directly using `pnpm [script name]`.

### `proxy-package.js`

This tool generates "proxy packages" for npm publishing.

#### What are Proxy Packages?

Proxy packages are `package.json` file created for each indiviual exported modules.

It is needed for platforms that doesn't not support "exports" field in `package.json`:
These platforms typically support `main` and `module` fields for CommonJS and ES Modules respectively. The proxy packages `package.json` files redirect the imports to the correct entry point, using the `main` and `module` fields.

#### Generate Proxy Packages

Generate proxy packages for package that have exports.

```bash
pnpm proxy-package generate
```

#### Hide Proxy Packages

Hide generated proxy packages `package.json` files from vscode editor and git.

```bash
pnpm proxy-package hide
```

### `rivet.sh`

**Foundry version manager and wrapper script**

- Automatically installs foundry if not present
- Pins foundry to version specified in `.foundry-version` file
- Searches for `.foundry-version` file in current directory and parent directories
- Passes all arguments to the appropriate foundry command (forge, cast, anvil, chisel)
- Exits with error if no `.foundry-version` file is found

```bash
pnpm rivet forge build
pnpm rivet cast call 0x123...
```

### `backup-nuke-restore.sh`

**Safe folder cleanup with backup and restore**

- Backs up specified files before nuking a folder
- Runs a command (e.g., build process) in the cleaned folder
- Restores backed up files regardless of command success/failure
- Includes safety guards to prevent nuking important directories

```bash
pnpm backup-nuke-restore /tmp/build "npm run build" package.json src/
```

### `replace-workspace-version.js`

**Workspace version replacement utility**

- Node.js wrapper for the TypeScript version replacement tool
- Updates package versions across the workspace
- Delegates to the main TypeScript implementation

```bash
pnpm replace-workspace-version [options]
```

### `merge-json.js`

**JSON file merging utility**

- Node.js wrapper for merging JSON files
- Useful for combining configuration files
- Delegates to the main TypeScript implementation

```bash
pnpm merge-json [options]
```

### `proxy-package.js`

**Proxy package generation**

- Node.js wrapper for generating proxy packages
- Creates individual package.json files for exported modules
- Delegates to the main TypeScript implementation

```bash
pnpm proxy-package [options]
```

### `add-mdx-autogen-warning.sh`

**Adds auto-generation warning to MDX files**

- Prepends a warning comment to mark files as automatically generated
- Includes instructions on how to regenerate the file
- Used for documentation files that shouldn't be manually edited

```bash
pnpm add-mdx-autogen-warning <file>
```

### `generate-readme-as-index-mdx.sh`

**Converts README.md to index.mdx for documentation**

- Copies README.md from source to target as index.mdx
- Adds auto-generation warning to the resulting file
- Useful for creating documentation index files

```bash
pnpm generate-readme-as-index-mdx <repo-folder-path> <target-folder-path>
```

### `prepend-mdx-comment.sh`

**Prepends comments to files in MDX format**

- Adds JSX comment blocks to the beginning of files
- Used for marking files as auto-generated
- Supports multi-line comments

```bash
pnpm prepend-mdx-comment <file> <comment>
```
