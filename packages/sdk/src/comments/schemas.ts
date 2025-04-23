import { z } from "zod";
import { HexSchema } from "../schemas/core.js";

export const CommentDataSchema = z.object({
  author: HexSchema,
  appSigner: HexSchema,

  channelId: z.bigint(),
  nonce: z.bigint(),
  deadline: z.bigint(),
  parentId: HexSchema,

  content: z.string(),
  metadata: z.string(),
  targetUri: z.string(),
  commentType: z.string(),
});
