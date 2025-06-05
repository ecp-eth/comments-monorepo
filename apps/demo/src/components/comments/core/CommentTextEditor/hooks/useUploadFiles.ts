import { PinataSDK, type UploadResponse } from "pinata";
import { publicEnv } from "@/publicEnv";
import { useMemo } from "react";
import type {
  UploadTrackerFileToUpload,
  UploadTrackerUploadedFile,
} from "../extensions/UploadTracker";
import { GenerateUploadUrlResponseSchema } from "@/lib/schemas";

type UploadCallbacks = {
  onError?: (uploadedFileId: string, error: Error) => void;
  onSuccess?: (
    uploadedFile: UploadTrackerUploadedFile,
    response: UploadResponse,
  ) => void;
};

const pinata = new PinataSDK({
  pinataGateway: publicEnv.NEXT_PUBLIC_PINATA_GATEWAY_URL,
});

type UseUploadFilesReturn = {
  uploadFile: (
    file: UploadTrackerFileToUpload,
    callbacks?: UploadCallbacks,
  ) => Promise<UploadResponse>;
  uploadFiles: (
    files: UploadTrackerFileToUpload[],
    callbacks?: UploadCallbacks,
  ) => Promise<UploadResponse[]>;
};

export function useUploadFiles(): UseUploadFilesReturn {
  return useMemo(() => {
    const uploadFile = async (
      file: UploadTrackerFileToUpload,
      callbacks?: UploadCallbacks,
    ) => {
      try {
        // first obtain upload url
        const uploadUrlResponse = await fetch("/api/generate-upload-url", {
          method: "POST",
          body: JSON.stringify({ filename: file.name }),
        });

        if (!uploadUrlResponse.ok) {
          throw new Error("Failed to generate upload URL");
        }

        const { url: uploadUrl } = GenerateUploadUrlResponseSchema.parse(
          await uploadUrlResponse.json(),
        );

        const uploadResponse = await pinata.upload.public
          .file(file.file)
          .url(uploadUrl);

        const fileUrl = await pinata.gateways.public.convert(
          uploadResponse.cid,
        );

        callbacks?.onSuccess?.(
          {
            id: file.id,
            name: uploadResponse.name,
            url: fileUrl,
            mimeType: uploadResponse.mime_type,
          },
          uploadResponse,
        );

        return uploadResponse;
      } catch (e) {
        callbacks?.onError?.(
          file.id,
          e instanceof Error ? e : new Error(String(e)),
        );

        throw e;
      }
    };

    const uploadFiles = async (
      files: UploadTrackerFileToUpload[],
      callbacks?: UploadCallbacks,
    ) => {
      return Promise.all(files.map((file) => uploadFile(file, callbacks)));
    };

    return {
      uploadFile,
      uploadFiles,
    };
  }, []);
}
