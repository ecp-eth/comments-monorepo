#!/bin/bash

# Usage: ./add-mdx-autogen-warning.sh <file>

# Check if the file is provided
if [ "$#" -ne 1 ]; then
  echo "Usage: $0 <file>"
  exit 1
fi

file=$1
# Get the directory of the current script
script_dir="$(dirname "$0")"

# Prepend the comment to the file using a heredoc
"$script_dir/prepend-mdx-comment.sh" "$file" "$(cat <<EOF
  !!DO NOT EDIT!!
  Automatically generated doc.
  run \`pnpm run $npm_lifecycle_event\` to update
  !!DO NOT EDIT!!
EOF
)"
