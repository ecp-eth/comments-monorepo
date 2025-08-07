import { fetchComments } from "@ecp.eth/sdk/indexer";

// This example shows how to fetch comments without moderation.
// This is useful if you want to display comments immediately without waiting for moderation approval.
async function main() {
  const comments = await fetchComments({
    moderationStatus: ["approved", "pending"],
    chainId: 8453,
  });

  console.log("Comments:", comments);
}

main();
