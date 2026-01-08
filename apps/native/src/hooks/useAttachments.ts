import { useCallback, useState, useEffect, useRef, useMemo } from "react";
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
  const hasValidId = fieldResponseClientId && fieldResponseClientId.length > 0;
  const [pendingAttachmentId, setPendingAttachmentId] = useState<string | null>(null);
  const [localAttachment, setLocalAttachment] = useState<Attachment | null>(null);
  const localAttachmentRef = useRef<Attachment | null>(null);

  const { data: allUserAttachments } = useLiveQuery(
    db.select().from(attachments).where(eq(attachments.userId, userId))
  );

  const attachmentFromQuery = useMemo(() => {
    if (!allUserAttachments) return null;
    if (pendingAttachmentId) {
      return allUserAttachments.find(a => a.clientId === pendingAttachmentId) ?? null;
    }
    if (hasValidId) {
      return allUserAttachments.find(a => a.fieldResponseClientId === fieldResponseClientId) ?? null;
    }
    return null;
  }, [allUserAttachments, pendingAttachmentId, hasValidId, fieldResponseClientId]);

  useEffect(() => {
    if (attachmentFromQuery && pendingAttachmentId) {
      setPendingAttachmentId(null);
    }
  }, [attachmentFromQuery, pendingAttachmentId]);

  useEffect(() => {
    if (attachmentFromQuery && localAttachment) {
      setLocalAttachment(null);
      localAttachmentRef.current = null;
    }
  }, [attachmentFromQuery, localAttachment]);

  const attachment = attachmentFromQuery ?? localAttachment ?? null;
  const isLocalPreview = localAttachment !== null && !attachmentFromQuery;

  const createAttachment = useCallback(
    async (input: AttachmentInput): Promise<string> => {
      const now = new Date();
      const clientId = uuidv4();

      const savedFile = await saveToLocalStorage(input.uri, input.fileName, input.mimeType);
      const fileType = getFileTypeFromMimeType(savedFile.mimeType);

      const newAttachment: Attachment = {
        clientId,
        serverId: null,
        fieldResponseClientId: input.fieldResponseClientId,
        localUri: savedFile.localUri,
        storageId: null,
        storageUrl: null,
        fileName: savedFile.fileName,
        fileType,
        mimeType: savedFile.mimeType,
        fileSize: savedFile.fileSize,
        userId,
        uploadStatus: "pending",
        createdAt: now,
        updatedAt: now,
        syncStatus: "pending",
      };

      await db.insert(attachments).values(newAttachment);

      setLocalAttachment(newAttachment);
      localAttachmentRef.current = newAttachment;
      setPendingAttachmentId(clientId);

      if (networkMonitor.getIsOnline()) {
        db.update(attachments)
          .set({ uploadStatus: "uploading" })
          .where(eq(attachments.clientId, clientId))
          .then(() => {
            if (localAttachmentRef.current?.clientId === clientId) {
              setLocalAttachment({ ...localAttachmentRef.current, uploadStatus: "uploading" });
              localAttachmentRef.current = { ...localAttachmentRef.current, uploadStatus: "uploading" };
            }

            return uploadAndSaveAttachment(
              convex,
              savedFile.localUri,
              savedFile.mimeType,
              clientId,
              input.fieldResponseClientId,
              savedFile.fileName,
              fileType,
              savedFile.fileSize,
              userId
            );
          })
          .then(async (result) => {
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

              if (localAttachmentRef.current?.clientId === clientId) {
                setLocalAttachment({
                  ...localAttachmentRef.current,
                  serverId: result.serverId ?? null,
                  storageId: result.storageId,
                  uploadStatus: "uploaded",
                  syncStatus: "synced",
                });
              }
            } else {
              await db
                .update(attachments)
                .set({ uploadStatus: "failed" })
                .where(eq(attachments.clientId, clientId));

              if (localAttachmentRef.current?.clientId === clientId) {
                setLocalAttachment({ ...localAttachmentRef.current, uploadStatus: "failed" });
              }

              const payload = {
                clientId,
                fieldResponseClientId: input.fieldResponseClientId,
                localUri: savedFile.localUri,
                fileName: savedFile.fileName,
                fileType,
                mimeType: savedFile.mimeType,
                fileSize: savedFile.fileSize,
                userId,
                uploadStatus: "pending",
                createdAt: now.getTime(),
                updatedAt: now.getTime(),
              };
              await addToQueue("attachments", "upload", clientId, payload);
              await syncService.updatePendingCount();
            }
          })
          .catch(async () => {
            await db
              .update(attachments)
              .set({ uploadStatus: "failed" })
              .where(eq(attachments.clientId, clientId));

            if (localAttachmentRef.current?.clientId === clientId) {
              setLocalAttachment({ ...localAttachmentRef.current, uploadStatus: "failed" });
            }

            const payload = {
              clientId,
              fieldResponseClientId: input.fieldResponseClientId,
              localUri: savedFile.localUri,
              fileName: savedFile.fileName,
              fileType,
              mimeType: savedFile.mimeType,
              fileSize: savedFile.fileSize,
              userId,
              uploadStatus: "pending",
              createdAt: now.getTime(),
              updatedAt: now.getTime(),
            };
            await addToQueue("attachments", "upload", clientId, payload);
            await syncService.updatePendingCount();
          });
      } else {
        const payload = {
          clientId,
          fieldResponseClientId: input.fieldResponseClientId,
          localUri: savedFile.localUri,
          fileName: savedFile.fileName,
          fileType,
          mimeType: savedFile.mimeType,
          fileSize: savedFile.fileSize,
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
      }
    }

    await db.delete(attachments).where(eq(attachments.clientId, attachment.clientId));
    setLocalAttachment(null);
    localAttachmentRef.current = null;
    setPendingAttachmentId(null);
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
    isLocalPreview,
    createAttachment,
    removeAttachment,
    retryUpload,
  };
}
