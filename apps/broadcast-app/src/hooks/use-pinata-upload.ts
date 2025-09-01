import { GenerateUploadUrlResponseSchema } from "@/api/schemas";
import { publicEnv } from "@/env/public";
import { PinataSDK } from "pinata";
import { useCallback, useState } from "react";

async function generateUploadUrl(filename: string): Promise<string> {
  const response = await fetch("/api/generate-upload-url", {
    method: "POST",
    body: JSON.stringify({ filename }),
  });

  if (!response.ok) {
    throw new Error("Failed to generate upload URL");
  }

  const { url } = GenerateUploadUrlResponseSchema.parse(await response.json());

  return url;
}

export type PinataUploadResponse = {
  cid: string;
  url: string;
  name: string;
  mimeType: string;
};

export function usePinataUpload() {
  const [pinata] = useState(() => {
    return new PinataSDK({
      pinataGateway: publicEnv.NEXT_PUBLIC_PINATA_GATEWAY_URL,
    });
  });

  return useCallback(
    async (file: File): Promise<PinataUploadResponse> => {
      const uploadUrl = await generateUploadUrl(file.name);

      const uploadResponse = await pinata.upload.public
        .file(file)
        .url(uploadUrl);

      const fileUrl = await pinata.gateways.public.convert(uploadResponse.cid);

      return {
        cid: uploadResponse.cid,
        url: fileUrl,
        name: uploadResponse.name,
        mimeType: uploadResponse.mime_type,
      };
    },
    [pinata],
  );
}
