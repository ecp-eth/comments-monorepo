import z from "zod";
import {
  ChannelNotFoundError,
  resolveNFTMetadata,
} from "../../../../resolve-nft-metadata";
import { config } from "../../../../config";

const paramsParser = z.object({
  channelId: z.string().transform((val) => z.coerce.bigint().parse(val)),
  chainId: z
    .string()
    .transform((val) => z.coerce.number().int().positive().parse(val)),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<z.input<typeof paramsParser>> },
) {
  const paramsResult = paramsParser.safeParse(await params);

  if (!paramsResult.success) {
    return Response.json(paramsResult.error.flatten().fieldErrors, {
      status: 400,
    });
  }

  const chain = config.chains[paramsResult.data.chainId];

  if (!chain) {
    return Response.json({ message: "Chain not found" }, { status: 404 });
  }

  try {
    const metadata = await resolveNFTMetadata(
      chain,
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
