# Scripts

This directory contains utility scripts for the documentation site.

## generate-sitemap.ts

Automatically generates a `sitemap.xml` file for the documentation site by scanning the `pages/` directory structure.

### Usage

```bash
# Generate sitemap manually
pnpm run generate-sitemap

# Or run directly with tsx
tsx scripts/generate-sitemap.ts
```

### Features

- **Automatic URL Discovery**: Scans all `.mdx` files in the `pages/` directory recursively
- **Proper URL Structure**: Converts file paths to proper URLs (e.g., `pages/guides/nextjs-demo.mdx` → `https://docs.ethcomments.xyz/guides/nextjs-demo`)
- **Index File Handling**: Properly handles `index.mdx` files to create directory URLs
- **Metadata**: Includes last modified dates, change frequency, and priority for each URL
- **SEO Optimized**: Follows sitemap protocol standards

### Output

The script generates a `sitemap.xml` file in the `public/` directory with:

- All documentation URLs
- Last modified timestamps (based on file modification time)
- Change frequency (set to "weekly")
- Priority based on content type:
  - **1.0** for homepage
  - **0.8** for main documentation pages
  - **0.4** for SDK reference pages (lower priority for technical documentation)

### Integration

The script is automatically run during the build process via the `build` script in `package.json`.
