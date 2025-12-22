import { useCallback } from "react";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { db } from "../db/client";
import { attachments } from "../db/schema";
import { addToQueue } from "../sync/SyncQueue";
import { syncService } from "../sync/SyncService";
import { networkMonitor } from "../sync/NetworkMonitor";
import { useConvex } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Attachment } from "../db/types";
import {
  saveToLocalStorage,
  deleteLocalFile,
  getFileTypeFromMimeType,
} from "../services/AttachmentStorage";
import { uploadAndSaveAttachment } from "../services/AttachmentUploader";

export interface AttachmentInput {
  fieldResponseClientId: string;
  uri: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
}

export function useAttachments(fieldResponseClientId: string, userId: string) {
  const convex = useConvex();

  const { data: attachmentData } = useLiveQuery(
    db
      .select()
      .from(attachments)
      .where(eq(attachments.fieldResponseClientId, fieldResponseClientId))
  );

  const attachment = attachmentData?.[0] ?? null;

  const createAttachment = useCallback(
    async (input: AttachmentInput): Promise<string> => {
      const now = new Date();
      const clientId = uuidv4();
      const fileType = getFileTypeFromMimeType(input.mimeType);

      const localUri = await saveToLocalStorage(input.uri, input.fileName);

      await db.insert(attachments).values({
        clientId,
        fieldResponseClientId: input.fieldResponseClientId,
        localUri,
        fileName: input.fileName,
        fileType,
        mimeType: input.mimeType,
        fileSize: input.fileSize,
        userId,
        uploadStatus: "pending",
        createdAt: now,
        updatedAt: now,
        syncStatus: "pending",
      });

      if (networkMonitor.getIsOnline()) {
        try {
          await db
            .update(attachments)
            .set({ uploadStatus: "uploading" })
            .where(eq(attachments.clientId, clientId));

          const result = await uploadAndSaveAttachment(
            convex,
            localUri,
            input.mimeType,
            clientId,
            input.fieldResponseClientId,
            input.fileName,
            fileType,
            input.fileSize,
            userId
          );

          if (result.success && result.storageId) {
            await db
              .update(attachments)
              .set({
                serverId: result.serverId,
                storageId: result.storageId,
                uploadStatus: "uploaded",
                syncStatus: "synced",
              })
              .where(eq(attachments.clientId, clientId));
          } else {
            await db
              .update(attachments)
              .set({ uploadStatus: "failed" })
              .where(eq(attachments.clientId, clientId));

            const payload = {
              clientId,
              fieldResponseClientId: input.fieldResponseClientId,
              localUri,
              fileName: input.fileName,
              fileType,
              mimeType: input.mimeType,
              fileSize: input.fileSize,
              userId,
              uploadStatus: "pending",
              createdAt: now.getTime(),
              updatedAt: now.getTime(),
            };
            await addToQueue("attachments", "upload", clientId, payload);
            await syncService.updatePendingCount();
          }
        } catch {
          await db
            .update(attachments)
            .set({ uploadStatus: "failed" })
            .where(eq(attachments.clientId, clientId));

          const payload = {
            clientId,
            fieldResponseClientId: input.fieldResponseClientId,
            localUri,
            fileName: input.fileName,
            fileType,
            mimeType: input.mimeType,
            fileSize: input.fileSize,
            userId,
            uploadStatus: "pending",
            createdAt: now.getTime(),
            updatedAt: now.getTime(),
          };
          await addToQueue("attachments", "upload", clientId, payload);
          await syncService.updatePendingCount();
        }
      } else {
        const payload = {
          clientId,
          fieldResponseClientId: input.fieldResponseClientId,
          localUri,
          fileName: input.fileName,
          fileType,
          mimeType: input.mimeType,
          fileSize: input.fileSize,
          userId,
          uploadStatus: "pending",
          createdAt: now.getTime(),
          updatedAt: now.getTime(),
        };
        await addToQueue("attachments", "upload", clientId, payload);
        await syncService.updatePendingCount();
      }

      return clientId;
    },
    [convex, userId]
  );

  const removeAttachment = useCallback(async (): Promise<void> => {
    if (!attachment) return;

    if (attachment.localUri) {
      await deleteLocalFile(attachment.localUri);
    }

    if (attachment.storageId && networkMonitor.getIsOnline()) {
      try {
        await convex.mutation(api.shared.attachments.remove, {
          clientId: attachment.clientId,
        });
      } catch {
        // Ignore removal errors on server
      }
    }

    await db.delete(attachments).where(eq(attachments.clientId, attachment.clientId));
  }, [attachment, convex]);

  const retryUpload = useCallback(async (): Promise<void> => {
    if (!attachment || !attachment.localUri) return;

    if (!networkMonitor.getIsOnline()) {
      return;
    }

    try {
      await db
        .update(attachments)
        .set({ uploadStatus: "uploading" })
        .where(eq(attachments.clientId, attachment.clientId));

      const result = await uploadAndSaveAttachment(
        convex,
        attachment.localUri,
        attachment.mimeType,
        attachment.clientId,
        attachment.fieldResponseClientId,
        attachment.fileName,
        attachment.fileType,
        attachment.fileSize,
        userId
      );

      if (result.success && result.storageId) {
        await db
          .update(attachments)
          .set({
            serverId: result.serverId,
            storageId: result.storageId,
            uploadStatus: "uploaded",
            syncStatus: "synced",
          })
          .where(eq(attachments.clientId, attachment.clientId));
      } else {
        await db
          .update(attachments)
          .set({ uploadStatus: "failed" })
          .where(eq(attachments.clientId, attachment.clientId));
      }
    } catch {
      await db
        .update(attachments)
        .set({ uploadStatus: "failed" })
        .where(eq(attachments.clientId, attachment.clientId));
    }
  }, [attachment, convex, userId]);

  return {
    attachment,
    createAttachment,
    removeAttachment,
    retryUpload,
  };
}
