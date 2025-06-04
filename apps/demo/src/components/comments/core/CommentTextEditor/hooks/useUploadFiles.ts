import type { GenerateUploadUrlResponseSchemaType } from "@/app/api/generate-upload-url/route";
import { PinataSDK, type UploadResponse } from "pinata";
import { publicEnv } from "@/publicEnv";
import { useCallback, useMemo } from "react";
import type {
  UploadTrackerFileToUpload,
  UploadTrackerUploadedFile,
} from "../extensions/UploadTracker";

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
  const uploadFile = useCallback(
    async (file: UploadTrackerFileToUpload, callbacks?: UploadCallbacks) => {
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
          .file(file.file)
          .url(uploadUrl);

        const fileUrl = await pinata.gateways.public.convert(
          uploadResponse.cid,
        );

        if (callbacks?.onSuccess) {
          callbacks.onSuccess(
            {
              id: file.id,
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
            file.id,
            e instanceof Error ? e : new Error(String(e)),
          );
        }

        throw e;
      }
    },
    [],
  );

  const uploadFiles = useCallback(
    async (files: UploadTrackerFileToUpload[], callbacks?: UploadCallbacks) => {
      return Promise.all(files.map((file) => uploadFile(file, callbacks)));
    },
    [uploadFile],
  );

  return useMemo(() => {
    return {
      uploadFile,
      uploadFiles,
    };
  }, [uploadFile, uploadFiles]);
}
