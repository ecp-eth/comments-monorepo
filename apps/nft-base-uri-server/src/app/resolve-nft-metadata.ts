import { z } from "zod";
import { ChainConfig } from "./config";
import { createPublicClient, http } from "viem";
import { ChannelManagerABI, CHANNEL_MANAGER_ADDRESS } from "@ecp.eth/sdk";

export const ChannelIDParser = z.coerce.bigint();

type ChannelId = z.infer<typeof ChannelIDParser>;

export const NFTAttributeSchema = z.object({
  trait_type: z.string(),
  value: z.union([z.string(), z.number()]),
  display_type: z
    .enum(["number", "boost_percentage", "boost_number", "date"])
    .optional(),
  max_value: z.number().optional(),
});

export const NFTMetadataSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  image: z.string(),
  external_url: z.string().optional(),
  background_color: z.string().optional(),
  animation_url: z.string().optional(),
  youtube_url: z.string().optional(),
  attributes: z.array(NFTAttributeSchema).optional(),
});

export type NFTMetadata = z.infer<typeof NFTMetadataSchema>;

export async function resolveNFTMetadata(
  chainConfig: ChainConfig,
  channelId: ChannelId,
  requestUrl: string,
): Promise<Response> {
  try {
    const client = createPublicClient({
      transport: http(chainConfig.rpcUrl),
      chain: chainConfig.chain,
    });

    const channel = await client.readContract({
      address: CHANNEL_MANAGER_ADDRESS,
      abi: ChannelManagerABI,
      functionName: "getChannel",
      args: [channelId],
    });

    if (!channel.name) {
      return Response.json(
        {
          message: `Channel ${channelId} does not exist`,
        },
        { status: 404 },
      );
    }

    const imageUrl = new URL("/nft.png", requestUrl);

    return Response.json({
      name: "Ethereum Comments Protocol Channel #" + channelId,
      description:
        "This NFT represents ownership of an Ethereum Comments Protocol Channel. Channel owners can customize comment rules, set hooks for gating access, charge fees, and integrate with other protocols. Use this channel to build your on-chain community!",
      image: imageUrl.toString(),
      attributes: [],
    });
  } catch (error) {
    console.error("Error resolving NFT metadata:", error);

    return Response.json(
      {
        message: `Failed to resolve metadata for channel ${channelId}`,
      },
      { status: 500 },
    );
  }
}
