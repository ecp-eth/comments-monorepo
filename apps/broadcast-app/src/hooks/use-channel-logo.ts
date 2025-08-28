import { useMemo } from "react";
import type { Channel } from "@/api/schemas";
import {
  convertContractToRecordFormat,
  createKeyTypeMap,
  decodeStringValue,
} from "@ecp.eth/sdk/comments";

export function useChannelLogo(channel: Channel): string | undefined {
  return useMemo(() => {
    if (channel.metadata.length === 0) {
      return;
    }

    const channelMetadata = convertContractToRecordFormat(
      channel.metadata,
      createKeyTypeMap([
        {
          key: "image",
          type: "string",
        },
      ]),
    );
    const key = "string image";

    if (!channelMetadata[key]) {
      return;
    }

    const imageUrl = decodeStringValue(channelMetadata[key].value);

    if (typeof imageUrl === "string" && URL.canParse(imageUrl)) {
      return imageUrl;
    }

    return;
  }, [channel]);
}
