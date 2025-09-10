#!/bin/bash

TARGET_FILENAME="schemas.ts"
TARGET_PATHNAME="lib/generated/${TARGET_FILENAME}"

CONTRACTS_FILENAME="contract-addresses.ts"
CONTRACTS_TARGET_PATHNAME="lib/generated/${CONTRACTS_FILENAME}"

WARNING_MESSAGE="// !!! DO NOT MODIFY !!!\n// THIS FILE IS COPIED DIRECTLY FROM DEMO APP\n// Run script instead: \`pnpm run api:schema:sync\`"

cd "$(dirname "$0")/.."

echo "Syncing API schemas..."

echo "PWD: $(pwd)"

rm ${TARGET_PATHNAME}

cp "../../apps/demo/src/lib/schemas.ts" ${TARGET_PATHNAME}

{ echo -e "${WARNING_MESSAGE}"; cat $TARGET_PATHNAME; } > temp 

# Remove temp file and restore original file
rm $TARGET_PATHNAME
mv temp $TARGET_PATHNAME

echo "Syncing contract addresses..."

REGEX_EXTRACT_ADDRESS="s/.*= \"(.*)\";/\1/g"

# Extract localCommentAddressManager from SDK constants
LOCAL_COMMENT_ADDRESS=$(grep -m 1 "localCommentAddressManager" "../../packages/sdk/src/constants.ts" | sed -E "${REGEX_EXTRACT_ADDRESS}")
LOCAL_CHANNEL_ADDRESS=$(grep -m 1 "localChannelAddressManager" "../../packages/sdk/src/constants.ts" | sed -E "${REGEX_EXTRACT_ADDRESS}")

echo "LOCAL_COMMENT_ADDRESS: ${LOCAL_COMMENT_ADDRESS}"
echo "LOCAL_CHANNEL_ADDRESS: ${LOCAL_CHANNEL_ADDRESS}"

if [ -z "${LOCAL_COMMENT_ADDRESS}" ] || [ -z "${LOCAL_CHANNEL_ADDRESS}" ]; then
  echo "Error: Failed to extract contract addresses from SDK constants"
  exit 1
fi

# Create contract-addresses.ts with extracted values
cat > ${CONTRACTS_TARGET_PATHNAME} << EOF
${WARNING_MESSAGE}

/**
 * Local comment address manager for development
 * Extracted from packages/sdk/src/constants.ts
 */
export const LOCAL_COMMENT_ADDRESS_MANAGER = "${LOCAL_COMMENT_ADDRESS}";

/**
 * Local channel address manager for development
 * Extracted from packages/sdk/src/constants.ts
 */
export const LOCAL_CHANNEL_ADDRESS_MANAGER = "${LOCAL_CHANNEL_ADDRESS}";
EOF

# sed 's/@ecp\.eth\/sdk\/schemas/@ecp.eth\/sdk\/dist\/schemas/g' $TARGET_PATHNAME > temp
# rm $TARGET_PATHNAME
# mv temp $TARGET_PATHNAME

echo "API schemas and contract addresses synced"