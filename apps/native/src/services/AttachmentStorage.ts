import * as FileSystem from "expo-file-system/legacy";
import { compressImage, isImageMimeType } from "./ImageCompressor";

const ATTACHMENTS_DIR = `${FileSystem.documentDirectory}attachments/`;

export async function ensureAttachmentsDir(): Promise<void> {
  const dirInfo = await FileSystem.getInfoAsync(ATTACHMENTS_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(ATTACHMENTS_DIR, { intermediates: true });
  }
}

export interface SavedFileInfo {
  localUri: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
}

export async function saveToLocalStorage(
  sourceUri: string,
  fileName: string,
  mimeType: string
): Promise<SavedFileInfo> {
  await ensureAttachmentsDir();

  const timestamp = Date.now();
  let finalUri = sourceUri;
  let finalFileName = fileName;
  let finalMimeType = mimeType;

  if (isImageMimeType(mimeType)) {
    const compressed = await compressImage(sourceUri);
    finalUri = compressed.uri;
    const baseName = fileName.replace(/\.[^/.]+$/, "");
    finalFileName = `${baseName}.jpg`;
    finalMimeType = "image/jpeg";
  }

  const uniqueFileName = `${timestamp}_${finalFileName}`;
  const destPath = `${ATTACHMENTS_DIR}${uniqueFileName}`;

  await FileSystem.copyAsync({
    from: finalUri,
    to: destPath,
  });

  const fileInfo = await FileSystem.getInfoAsync(destPath);
  const fileSize = fileInfo.exists && "size" in fileInfo ? fileInfo.size : 0;

  return {
    localUri: destPath,
    fileName: finalFileName,
    mimeType: finalMimeType,
    fileSize,
  };
}

export async function deleteLocalFile(localUri: string): Promise<void> {
  const fileInfo = await FileSystem.getInfoAsync(localUri);
  if (fileInfo.exists) {
    await FileSystem.deleteAsync(localUri, { idempotent: true });
  }
}

export async function getFileInfo(uri: string): Promise<{
  size: number;
  exists: boolean;
}> {
  const info = await FileSystem.getInfoAsync(uri);
  return {
    size: info.exists && "size" in info ? info.size : 0,
    exists: info.exists,
  };
}

export async function getLocalUri(fileName: string): Promise<string> {
  return `${ATTACHMENTS_DIR}${fileName}`;
}

export async function cleanupOldAttachments(keepClientIds: string[]): Promise<void> {
  await ensureAttachmentsDir();

  const files = await FileSystem.readDirectoryAsync(ATTACHMENTS_DIR);

  for (const file of files) {
    const filePath = `${ATTACHMENTS_DIR}${file}`;
    const shouldKeep = keepClientIds.some((id) => file.includes(id));

    if (!shouldKeep) {
      await FileSystem.deleteAsync(filePath, { idempotent: true });
    }
  }
}

export function getMimeTypeFromExtension(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    heic: "image/heic",
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };
  return mimeTypes[ext || ""] || "application/octet-stream";
}

export function getFileTypeFromMimeType(mimeType: string): "image" | "document" {
  return mimeType.startsWith("image/") ? "image" : "document";
}
