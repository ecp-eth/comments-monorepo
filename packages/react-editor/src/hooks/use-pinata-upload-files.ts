import { PinataSDK, type UploadResponse } from "pinata";
import { useMemo, useRef, useState } from "react";
import type { UploadFilesService } from "../types.js";
import { ALLOWED_UPLOAD_MIME_TYPES, MAX_UPLOAD_FILE_SIZE } from "../constants";

/**
 * Function to generate an upload URL for a file.
 */
export type PinataGenerateUploadUrlFunction = (
  filename: string,
) => Promise<string>;

export type UsePinataUploadFilesReturn = UploadFilesService<UploadResponse>;

export type UsePinataUploadFilesOptions = {
  /**
   * URL of the Pinata gateway.
   */
  pinataGatewayUrl: string;
  /**
   * Maximum file size in bytes.
   *
   * @default MAX_UPLOAD_FILE_SIZE
   */
  maxFileSize?: number;
  /**
   * Allowed MIME types.
   *
   * @default ALLOWED_UPLOAD_MIME_TYPES
   */
  allowedMimeTypes?: string[];
  /**
   * Function to generate an upload URL for a file.
   */
  generateUploadUrl: PinataGenerateUploadUrlFunction;
};

/**
 * Hook to upload files to Pinata.
 *
 * @param options - Options for the hook.
 */
export function usePinataUploadFiles({
  pinataGatewayUrl,
  maxFileSize = MAX_UPLOAD_FILE_SIZE,
  allowedMimeTypes = ALLOWED_UPLOAD_MIME_TYPES,
  generateUploadUrl,
}: UsePinataUploadFilesOptions): UsePinataUploadFilesReturn {
  const [pinata] = useState(() => {
    return new PinataSDK({
      pinataGateway: pinataGatewayUrl,
    });
  });
  const maxFileSizeRef = useRef(maxFileSize);
  const allowedMimeTypesRef = useRef(allowedMimeTypes);
  const generateUploadUrlRef = useRef(generateUploadUrl);

  return useMemo<UsePinataUploadFilesReturn>(() => {
    const uploadFile: UsePinataUploadFilesReturn["uploadFile"] = async (
      file,
      callbacks,
    ) => {
      try {
        const uploadUrl = await generateUploadUrlRef.current(file.name);

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

    const uploadFiles: UsePinataUploadFilesReturn["uploadFiles"] = async (
      files,
      callbacks,
    ) => {
      return Promise.all(files.map((file) => uploadFile(file, callbacks)));
    };

    return {
      get allowedMimeTypes() {
        return allowedMimeTypesRef.current;
      },
      get maxFileSize() {
        return maxFileSizeRef.current;
      },
      uploadFile,
      uploadFiles,
    };
  }, [pinata]);
}
