import { IndexerAPICommentReferenceSchemaType } from "@ecp.eth/sdk/indexer";
import { JSONContent } from "@tiptap/core";
import {
  UPLOAD_TRACKER_NODE_NAME,
  type UploadTrackerAttributes,
} from "./extensions/upload-tracker.js";
import type { MentionItem } from "./extensions/types.js";

export function extractReferences(
  content: JSONContent,
): IndexerAPICommentReferenceSchemaType[] {
  const references: IndexerAPICommentReferenceSchemaType[] = [];

  if (content.type !== "doc") {
    throw new Error("Invalid content, expected doc");
  }

  const nodes = content.content ?? [];
  let currentPosition = 0;

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];

    if (!node) continue;

    if (node.type === "paragraph") {
      for (const child of node.content ?? []) {
        if (child.type === "text") {
          // advance position
          currentPosition += (child.text ?? "").length;
        } else if (child.type === "mention") {
          const mention = child.attrs as MentionItem;

          switch (mention.type) {
            case "farcaster": {
              // +1 because of @ prefix
              const length = mention.address.length + 1;

              references.push({
                type: "farcaster",
                fname: mention.fname,
                displayName: mention.displayName ?? null,
                address: mention.address,
                fid: mention.fid,
                pfpUrl: mention.pfpUrl ?? null,
                url: mention.url,
                username: mention.username,
                position: {
                  start: currentPosition,
                  end: currentPosition + length,
                },
              });

              currentPosition += length;
              break;
            }
            case "erc20": {
              const length = mention.caip19.length;

              references.push({
                type: "erc20",
                address: mention.address,
                chainId: mention.chainId,
                chains: [
                  {
                    caip: mention.caip19,
                    chainId: mention.chainId,
                  },
                ],
                decimals: mention.decimals,
                logoURI: mention.logoURI,
                name: mention.name,
                symbol: mention.symbol,
                position: {
                  start: currentPosition,
                  end: currentPosition + length,
                },
              });

              currentPosition += length;
              break;
            }
            case "ens": {
              // +1 because of @ prefix
              const length = mention.address.length + 1;

              references.push({
                type: "ens",
                address: mention.address,
                name: mention.name,
                position: {
                  start: currentPosition,
                  end: currentPosition + length,
                },
                url: mention.url,
                avatarUrl: null,
              });

              currentPosition += length;
              break;
            }
            default:
              throw new Error(
                `Unsupported mention type: ${(mention as any).type}`,
              );
          }
        }
      }

      currentPosition += 1;
    } else if (node.type === UPLOAD_TRACKER_NODE_NAME) {
      const attrs = node.attrs as UploadTrackerAttributes;
      if (!attrs || !attrs.uploads) continue;

      for (const file of attrs.uploads) {
        if (!("url" in file)) {
          throw new Error(
            "Make sure you first upload files before exracting references",
          );
        }

        if (file.mimeType.startsWith("image/")) {
          references.push({
            type: "image",
            mediaType: file.mimeType,
            position: {
              start: currentPosition,
              end: currentPosition + file.url.length,
            },
            url: file.url,
          });

          // +1 because of new line
          currentPosition += file.url.length + 1;
        } else if (file.mimeType.startsWith("video/")) {
          references.push({
            type: "video",
            mediaType: file.mimeType,
            position: {
              start: currentPosition,
              end: currentPosition + file.url.length,
            },
            url: file.url,
          });

          // +1 because of new line
          currentPosition += file.url.length + 1;
        } else {
          throw new Error(`Unsupported media type: ${file.mimeType}`);
        }
      }
    }
  }

  return references;
}
