import type { GenerateUploadUrlResponseSchemaType } from "@/app/api/generate-upload-url/route";
import { PinataSDK, type UploadResponse } from "pinata";
import { publicEnv } from "@/publicEnv";
import { useCallback, useMemo } from "react";
import type { UploadedFile } from "../extensions/UploadTracker";
import { generateId } from "../utils/generateId";

type UploadCallbacks = {
  onError?: (uploadedFileId: string, error: Error) => void;
  onSuccess?: (uploadedFile: UploadedFile, response: UploadResponse) => void;
};

const pinata = new PinataSDK({
  pinataGateway: publicEnv.NEXT_PUBLIC_PINATA_GATEWAY_URL,
});

type UseUploadFilesReturn = {
  uploadFile: (
    file: File,
    callbacks?: UploadCallbacks,
  ) => Promise<UploadResponse>;
  uploadFiles: (
    files: File[],
    callbacks?: UploadCallbacks,
  ) => Promise<UploadResponse[]>;
};

export function useUploadFiles(): UseUploadFilesReturn {
  const uploadFile = useCallback(
    async (file: File, callbacks?: UploadCallbacks) => {
      const fileId = generateId();

      try {
        // first obtain upload url
        const uploadUrlResponse = await fetch("/api/generate-upload-url", {
          method: "POST",
          body: JSON.stringify({ filename: file.name }),
        });

        if (!uploadUrlResponse.ok) {
          throw new Error("Failed to generate upload URL");
        }

        const { url: uploadUrl } =
          (await uploadUrlResponse.json()) as GenerateUploadUrlResponseSchemaType;

        const uploadResponse = await pinata.upload.public
          .file(file)
          .url(uploadUrl);

        const fileUrl = await pinata.gateways.public.convert(
          uploadResponse.cid,
        );

        if (callbacks?.onSuccess) {
          callbacks.onSuccess(
            {
              id: fileId,
              name: uploadResponse.name,
              url: fileUrl,
              mimeType: uploadResponse.mime_type,
            },
            uploadResponse,
          );
        }

        return uploadResponse;
      } catch (e) {
        if (callbacks?.onError) {
          callbacks.onError(
            fileId,
            e instanceof Error ? e : new Error(String(e)),
          );
        }

        throw e;
      }
    },
    [],
  );

  const uploadFiles = useCallback(
    async (files: File[], callbacks?: UploadCallbacks) => {
      return Promise.all(files.map((file) => uploadFile(file, callbacks)));
    },
    [uploadFile],
  );

  return useMemo(() => {
    return {
      uploadFile,
      uploadFiles,
    };
  }, []);
}
