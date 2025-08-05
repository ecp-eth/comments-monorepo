import { Command } from "commander";
import fs from "fs";

const program = new Command();

program
  .name("merge-json")
  .description("Merge two JSON files together")
  .argument("<file1>", "First JSON file path")
  .argument("<file2>", "Second JSON file path")
  .option("-o, --output <path>", "Output file path (defaults to file1)")
  .action(
    async (
      file1: string,
      file2: string,
      options: { output?: string; deep?: boolean; overwrite?: boolean },
    ) => {
      try {
        // Read both JSON files
        const json1 = JSON.parse(fs.readFileSync(file1, "utf8"));
        const json2 = JSON.parse(fs.readFileSync(file2, "utf8"));

        // Merge JSON objects
        let merged = { ...json1, ...json2 };

        // Determine output path
        let outputPath = options.output;
        if (!outputPath) {
          outputPath = file1;
        }

        // Write merged JSON
        fs.writeFileSync(outputPath, JSON.stringify(merged, null, 2));
        console.log(`Merged JSON written to: ${outputPath}`);
      } catch (error) {
        console.error("Error merging JSON files:", error);
        process.exit(1);
      }
    },
  );

program.parse();
