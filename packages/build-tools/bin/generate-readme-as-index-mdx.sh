#!/bin/bash

# Usage: ./generate-readme-as-index-mdx.sh <repo-folder-path> <target-folder-path>

# Check if the paths are provided
if [ "$#" -ne 2 ]; then
  echo "Usage: $0 <repo-folder-path> <target-folder-path>"
  exit 1
fi

repoFolderPath=$1
targetFolderPath=$2

repoReadmePath="${repoFolderPath}/README.md"
targetIndexMdxPath="${targetFolderPath}/index.mdx"

# Check if the file exists
if [ ! -f "$repoReadmePath" ]; then
  echo "Error: File '$repoReadmePath' not found!"
  exit 1
fi

rm -f "$targetIndexMdxPath"

cp "$repoReadmePath" "$targetIndexMdxPath"
echo "$repoReadmePath copied to $targetIndexMdxPath"

# Get the directory of the current script
script_dir="$(dirname "$0")"

# Run another script in the same directory
"$script_dir/add-mdx-autogen-warning.sh" "$targetIndexMdxPath"

echo "Done!"
