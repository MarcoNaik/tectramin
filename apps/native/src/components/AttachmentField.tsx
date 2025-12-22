import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import type { Attachment, AttachmentUploadStatus } from "../db/types";

interface AttachmentFieldProps {
  label: string;
  isRequired: boolean;
  attachment: Attachment | null;
  onPickImage: (uri: string, fileName: string, mimeType: string, fileSize: number, source: "camera" | "gallery") => Promise<void>;
  onPickDocument: (uri: string, fileName: string, mimeType: string, fileSize: number) => Promise<void>;
  onRemove: () => Promise<void>;
}

export function AttachmentField({
  label,
  isRequired,
  attachment,
  onPickImage,
  onPickDocument,
  onRemove,
}: AttachmentFieldProps) {
  const [loading, setLoading] = useState(false);

  const handleTakePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert("Permission Required", "Camera access is needed to take photos.");
      return;
    }

    setLoading(true);
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const fileName = asset.fileName || `photo_${Date.now()}.jpg`;
        const mimeType = asset.mimeType || "image/jpeg";
        const fileSize = asset.fileSize || 0;
        await onPickImage(asset.uri, fileName, mimeType, fileSize, "camera");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to take photo");
    } finally {
      setLoading(false);
    }
  };

  const handleChooseFromGallery = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert("Permission Required", "Gallery access is needed to select photos.");
      return;
    }

    setLoading(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const fileName = asset.fileName || `image_${Date.now()}.jpg`;
        const mimeType = asset.mimeType || "image/jpeg";
        const fileSize = asset.fileSize || 0;
        await onPickImage(asset.uri, fileName, mimeType, fileSize, "gallery");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to select image");
    } finally {
      setLoading(false);
    }
  };

  const handleChooseDocument = async () => {
    setLoading(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        await onPickDocument(asset.uri, asset.name, asset.mimeType || "application/octet-stream", asset.size || 0);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to select document");
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = () => {
    Alert.alert(
      "Remove Attachment",
      "Are you sure you want to remove this attachment?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Remove", style: "destructive", onPress: () => onRemove() },
      ]
    );
  };

  const getStatusColor = (status: AttachmentUploadStatus): string => {
    switch (status) {
      case "pending":
        return "#f59e0b";
      case "uploading":
        return "#3b82f6";
      case "uploaded":
        return "#10b981";
      case "failed":
        return "#ef4444";
      default:
        return "#6b7280";
    }
  };

  const getStatusText = (status: AttachmentUploadStatus): string => {
    switch (status) {
      case "pending":
        return "Waiting to upload";
      case "uploading":
        return "Uploading...";
      case "uploaded":
        return "Uploaded";
      case "failed":
        return "Upload failed";
      default:
        return status;
    }
  };

  const isImage = attachment?.fileType === "image";

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label}
        {isRequired ? " *" : ""}
      </Text>

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#2563eb" />
          <Text style={styles.loadingText}>Processing...</Text>
        </View>
      )}

      {!loading && attachment && (
        <View style={styles.previewContainer}>
          {isImage && attachment.localUri ? (
            <Image source={{ uri: attachment.localUri }} style={styles.imagePreview} />
          ) : (
            <View style={styles.documentPreview}>
              <Text style={styles.documentIcon}>📄</Text>
              <Text style={styles.documentName} numberOfLines={1}>
                {attachment.fileName}
              </Text>
            </View>
          )}
          <View style={styles.statusContainer}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(attachment.uploadStatus as AttachmentUploadStatus) }]}>
              <Text style={styles.statusText}>{getStatusText(attachment.uploadStatus as AttachmentUploadStatus)}</Text>
            </View>
            <Text style={styles.fileSize}>
              {(attachment.fileSize / 1024).toFixed(1)} KB
            </Text>
          </View>
          <TouchableOpacity style={styles.removeButton} onPress={handleRemove}>
            <Text style={styles.removeButtonText}>Remove</Text>
          </TouchableOpacity>
        </View>
      )}

      {!loading && !attachment && (
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.actionButton} onPress={handleTakePhoto}>
            <Text style={styles.actionButtonIcon}>📷</Text>
            <Text style={styles.actionButtonText}>Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={handleChooseFromGallery}>
            <Text style={styles.actionButtonIcon}>🖼️</Text>
            <Text style={styles.actionButtonText}>Gallery</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={handleChooseDocument}>
            <Text style={styles.actionButtonIcon}>📄</Text>
            <Text style={styles.actionButtonText}>Document</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 6,
    color: "#374151",
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  loadingText: {
    marginLeft: 8,
    color: "#6b7280",
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    flex: 1,
    backgroundColor: "#f3f4f6",
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  actionButtonIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  actionButtonText: {
    fontSize: 12,
    color: "#374151",
    fontWeight: "500",
  },
  previewContainer: {
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  imagePreview: {
    width: "100%",
    height: 150,
    borderRadius: 8,
    marginBottom: 8,
  },
  documentPreview: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  documentIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  documentName: {
    flex: 1,
    fontSize: 14,
    color: "#374151",
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "500",
  },
  fileSize: {
    fontSize: 12,
    color: "#6b7280",
  },
  removeButton: {
    backgroundColor: "#fee2e2",
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: "center",
  },
  removeButtonText: {
    color: "#dc2626",
    fontWeight: "500",
    fontSize: 14,
  },
});
