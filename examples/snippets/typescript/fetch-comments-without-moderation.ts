import { fetchComments } from "@ecp.eth/sdk/indexer";

async function main() {
  const comments = await fetchComments({
    moderationStatus: ["approved", "pending"],
    chainId: 8453,
  });

  console.log("Comments:", comments);
}

main();
