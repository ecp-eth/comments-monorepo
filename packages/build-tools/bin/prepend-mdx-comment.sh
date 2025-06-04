#!/bin/bash

# Usage: ./append-mdx-comment.sh <file> <comment>

# Check if the file and comment are provided
if [ "$#" -ne 2 ]; then
  echo "Usage: $0 <file> <comment>"
  exit 1
fi

file=$1
comment=$2

# Check if the file exists
if [ ! -f "$file" ]; then
  echo "Error: File '$file' not found!"
  exit 1
fi

# Prepend the comment to the file
temp_file=$(mktemp)
echo -e "{/*\n$comment\n*/}" > "$temp_file"
cat "$file" >> "$temp_file"
mv "$temp_file" "$file"

echo "Comment prepended to '$file'."
