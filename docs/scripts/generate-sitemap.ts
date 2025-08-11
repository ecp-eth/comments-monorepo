import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = "https://docs.ethcomments.xyz";

interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: string;
}

function getLastModified(filePath: string): string {
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

        // Convert path separators to URL separators
        urlPath = urlPath.replace(/\\/g, "/");

        const fullUrl =
          `${BASE_URL}/${urlPath}`.replace(/\/+$/, "") || BASE_URL;

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

  fs.writeFileSync(outputFile, sitemapXml);

  console.log(`\nSitemap generated successfully at: ${outputFile}`);
  console.log(`\nTotal URLs: ${urls.length}`);
}

// Check if this file is being run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { generateSitemapXml, scanDirectory };
