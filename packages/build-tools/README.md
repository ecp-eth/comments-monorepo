# Build Tools

This package contains internal build tools for the project.

## Tools and Scripts

### `proxy-package`

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
