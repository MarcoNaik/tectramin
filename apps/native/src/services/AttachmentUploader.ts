import * as FileSystem from "expo-file-system/legacy";
import type { ConvexReactClient } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";

export interface UploadResult {
  success: boolean;
  storageId?: string;
  error?: string;
}

export async function uploadAttachment(
  localUri: string,
  mimeType: string,
  convex: ConvexReactClient
): Promise<UploadResult> {
  try {
    const uploadUrl = await convex.mutation(api.shared.attachments.generateUploadUrl, {});

    const uploadResult = await FileSystem.uploadAsync(uploadUrl, localUri, {
      httpMethod: "POST",
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      headers: {
        "Content-Type": mimeType,
      },
    });

    if (uploadResult.status !== 200) {
      return {
        success: false,
        error: `Upload failed with status ${uploadResult.status}`,
      };
    }

    const responseBody = JSON.parse(uploadResult.body);
    const storageId = responseBody.storageId;

    if (!storageId) {
      return {
        success: false,
        error: "No storageId returned from upload",
      };
    }

    return {
      success: true,
      storageId,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error during upload",
    };
  }
}

export async function uploadAndSaveAttachment(
  convex: ConvexReactClient,
  localUri: string,
  mimeType: string,
  clientId: string,
  fieldResponseClientId: string,
  fileName: string,
  fileType: string,
  fileSize: number,
  userId: string
): Promise<UploadResult & { serverId?: string }> {
  const uploadResult = await uploadAttachment(localUri, mimeType, convex);

  if (!uploadResult.success || !uploadResult.storageId) {
    return uploadResult;
  }

  try {
    const serverId = await convex.mutation(api.shared.attachments.saveAfterUpload, {
      clientId,
      fieldResponseClientId,
      storageId: uploadResult.storageId as unknown as ReturnType<
        typeof import("convex/values").v.id<"_storage">
      >["type"],
      fileName,
      fileType,
      mimeType,
      fileSize,
      userId,
    });

    return {
      success: true,
      storageId: uploadResult.storageId,
      serverId: serverId as string,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to save attachment metadata",
    };
  }
}
