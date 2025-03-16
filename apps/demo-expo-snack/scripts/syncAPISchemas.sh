#!/bin/bash

TARGET_FILENAME="schemas.ts"
TARGET_PATHNAME="apps/demo-expo-snack/lib/${TARGET_FILENAME}"
cd "$(dirname "$0")/../../.."

echo "Syncing API schemas..."

echo "PWD: $(pwd)"

cp "apps/demo/src/lib/schemas.ts" ${TARGET_PATHNAME}

{ echo -e "// !!! DO NOT MODIFY !!!\n// THIS FILE IS COPIED DIRECTLY FROM DEMO APP\n// Run script instead: pnpm run api:schema:sync"; cat $TARGET_PATHNAME; } > temp 
rm $TARGET_PATHNAME
mv temp $TARGET_PATHNAME

echo "Synced API schemas"