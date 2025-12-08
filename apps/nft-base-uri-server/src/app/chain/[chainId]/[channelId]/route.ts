import z from "zod";
import { resolveNFTMetadataAsResponse } from "../../../resolve-nft-metadata";
import { config } from "../../../config";

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

  return resolveNFTMetadataAsResponse(
    chain,
    paramsResult.data.channelId,
    request.url,
  );
}
