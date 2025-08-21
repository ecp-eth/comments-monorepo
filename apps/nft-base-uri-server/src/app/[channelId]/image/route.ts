import z from "zod";
import {
  ChannelNotFoundError,
  resolveNFTMetadata,
} from "../../resolve-nft-metadata";
import { config } from "../../config";

const paramsParser = z.object({
  channelId: z.coerce.bigint(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<z.infer<typeof paramsParser>> },
) {
  const paramsResult = paramsParser.safeParse(await params);

  if (!paramsResult.success) {
    return Response.json(paramsResult.error.flatten().fieldErrors, {
      status: 400,
    });
  }

  try {
    const metadata = await resolveNFTMetadata(
      config.defaultChain,
      paramsResult.data.channelId,
      request.url,
    );

    return Response.redirect(metadata.image, 307);
  } catch (error) {
    if (error instanceof ChannelNotFoundError) {
      return Response.json(
        {
          message: `Channel ${paramsResult.data.channelId} does not exist`,
        },
        { status: 404 },
      );
    }

    console.error("Error resolving NFT metadata:", error);

    return Response.json(
      {
        message: `Failed to resolve metadata for channel ${paramsResult.data.channelId}`,
      },
      { status: 500 },
    );
  }
}
