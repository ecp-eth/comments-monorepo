import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = "https://docs.ethcomments.xyz";

let repoRoot: string;

interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: string;
}

function getLastModified(filePath: string): string {
  // Prefer Git last commit date for stability across environments
  try {
    repoRoot =
      repoRoot ??
      execSync("git rev-parse --show-toplevel", {
        cwd: __dirname,
      })
        .toString()
        .trim();

    const relativePath = path.relative(repoRoot, filePath);

    // Try committer date first; if unavailable, fall back to author date
    const gitDate = execSync(`git log -1 --format=%cI -- "${relativePath}"`, {
      cwd: repoRoot,
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();

    if (gitDate) {
      return new Date(gitDate).toISOString();
    }

    const authorDate = execSync(
      `git log -1 --format=%aI -- "${relativePath}"`,
      { cwd: repoRoot, stdio: ["ignore", "pipe", "ignore"] },
    )
      .toString()
      .trim();

    if (authorDate) {
      return new Date(authorDate).toISOString();
    }
  } catch {
    // Ignore and fall back to filesystem timestamp
    console.warn(`Failed to get Git date for ${filePath}`);
  }

  try {
    const stats = fs.statSync(filePath);
    return stats.mtime.toISOString();
  } catch {
    return new Date().toISOString();
  }
}

function scanDirectory(dirPath: string, basePath: string = ""): SitemapUrl[] {
  const urls: SitemapUrl[] = [];

  try {
    const items = fs.readdirSync(dirPath);

    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const relativePath = path.join(basePath, item);
      const stats = fs.statSync(fullPath);

      if (stats.isDirectory()) {
        // Recursively scan subdirectories
        const subUrls = scanDirectory(fullPath, relativePath);
        urls.push(...subUrls);
      } else if (stats.isFile() && item.endsWith(".mdx")) {
        // Convert file path to URL
        let urlPath = relativePath.replace(/\.mdx$/, "");

        // Handle index.mdx files
        if (item === "index.mdx") {
          urlPath = path.dirname(urlPath);
          if (urlPath === ".") {
            urlPath = "";
          }
        }

        // Convert Windows path separators to URL path separators
        urlPath = urlPath.replace(/\\/g, "/");

        // Remove leading slash if present
        if (urlPath.startsWith("/")) {
          urlPath = urlPath.substring(1);
        }

        // TODO: why ? urlPath comes from relativePath, and relativePath is already joined with basePath
        const fullUrl = urlPath ? `${BASE_URL}/${urlPath}` : BASE_URL;

        // Determine priority based on URL path
        let priority = "0.8";
        if (urlPath === "") {
          priority = "1.0"; // Homepage
        } else if (urlPath.startsWith("sdk-reference")) {
          priority = "0.4"; // SDK reference pages (lower priority)
        }

        urls.push({
          loc: fullUrl,
          lastmod: getLastModified(fullPath),
          changefreq: "weekly",
          priority,
        });
      }
    }
  } catch (error) {
    console.error(`Error scanning directory ${dirPath}:`, error);
  }

  return urls;
}

function generateSitemapXml(urls: SitemapUrl[]): string {
  const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>';
  const urlsetOpen =
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
  const urlsetClose = "</urlset>";

  const urlEntries = urls
    .map((url) => {
      const parts = [
        "  <url>",
        `    <loc>${url.loc}</loc>`,
        `    <lastmod>${url.lastmod}</lastmod>`,
        `    <changefreq>${url.changefreq}</changefreq>`,
        `    <priority>${url.priority}</priority>`,
        "  </url>",
      ];
      return parts.join("\n");
    })
    .join("\n");

  return `${xmlHeader}\n${urlsetOpen}\n${urlEntries}\n${urlsetClose}`;
}

function main() {
  const pagesDir = path.join(__dirname, "..", "pages");
  const outputFile = path.join(__dirname, "..", "public", "sitemap.xml");

  console.log("Scanning docs pages directory...");

  if (!fs.existsSync(pagesDir)) {
    console.error(`Pages directory not found: ${pagesDir}`);
    process.exit(1);
  }

  const urls = scanDirectory(pagesDir);

  console.log(`Found ${urls.length} URLs:`);
  urls.forEach((url) => {
    console.log(`  ${url.loc}`);
  });

  // Sort URLs for consistent output
  urls.sort((a, b) => a.loc.localeCompare(b.loc));

  const sitemapXml = generateSitemapXml(urls);

  // Ensure output directory exists
  const outputDir = path.dirname(outputFile);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write the sitemap file
  fs.writeFileSync(outputFile, sitemapXml, "utf8");

  console.log(`\nSitemap generated successfully at: ${outputFile}`);
  console.log(`\nTotal URLs: ${urls.length}`);
}

// Check if this file is being run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { generateSitemapXml, scanDirectory };
