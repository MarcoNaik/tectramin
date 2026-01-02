import { useState } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Text } from "./Text";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import type { Attachment, AttachmentUploadStatus } from "../db/types";

type AttachmentSource = "camera" | "gallery" | "document";

interface AttachmentConfig {
  sources?: AttachmentSource[];
}

const DEFAULT_SOURCES: AttachmentSource[] = ["camera", "gallery", "document"];

function parseAttachmentConfig(displayStyle: string | null | undefined): AttachmentConfig {
  if (!displayStyle) return {};
  try {
    const parsed = JSON.parse(displayStyle);
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      return parsed as AttachmentConfig;
    }
    return {};
  } catch {
    return {};
  }
}

interface AttachmentFieldProps {
  label: string;
  isRequired: boolean;
  displayStyle?: string | null;
  attachment: Attachment | null;
  isLocalPreview?: boolean;
  onPickImage: (uri: string, fileName: string, mimeType: string, fileSize: number, source: "camera" | "gallery") => Promise<void>;
  onPickDocument: (uri: string, fileName: string, mimeType: string, fileSize: number) => Promise<void>;
  onRemove: () => Promise<void>;
}

export function AttachmentField({
  label,
  isRequired,
  displayStyle,
  attachment,
  isLocalPreview = false,
  onPickImage,
  onPickDocument,
  onRemove,
}: AttachmentFieldProps) {
  const [loading, setLoading] = useState(false);
  const config = parseAttachmentConfig(displayStyle);
  const enabledSources = config.sources && config.sources.length > 0 ? config.sources : DEFAULT_SOURCES;

  const handleTakePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert("Permiso Requerido", "Se necesita acceso a la cámara para tomar fotos.");
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
      Alert.alert("Error", "Error al tomar la foto");
    } finally {
      setLoading(false);
    }
  };

  const handleChooseFromGallery = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert("Permiso Requerido", "Se necesita acceso a la galería para seleccionar fotos.");
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
      Alert.alert("Error", "Error al seleccionar imagen");
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
      Alert.alert("Error", "Error al seleccionar documento");
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = () => {
    Alert.alert(
      "Eliminar Adjunto",
      "¿Estás seguro de que quieres eliminar este adjunto?",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Eliminar", style: "destructive", onPress: () => onRemove() },
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
        return "Esperando subir";
      case "uploading":
        return "Subiendo...";
      case "uploaded":
        return "Subido";
      case "failed":
        return "Error al subir";
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
          <Text style={styles.loadingText}>Procesando...</Text>
        </View>
      )}

      {!loading && attachment && (
        <View style={styles.previewContainer}>
          {isImage && attachment.localUri ? (
            <Image source={{ uri: attachment.localUri }} style={styles.imagePreview} />
          ) : (
            <View style={styles.documentPreview}>
              <Text style={styles.documentIcon}>📄</Text>
              <Text style={styles.documentName}>
                {attachment.fileName}
              </Text>
            </View>
          )}
          {isLocalPreview && (
            <View style={styles.localPreviewBanner}>
              <ActivityIndicator size="small" color="#6b7280" />
              <Text style={styles.localPreviewText}>Sincronizando con base de datos...</Text>
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
            <Text style={styles.removeButtonText}>Eliminar</Text>
          </TouchableOpacity>
        </View>
      )}

      {!loading && !attachment && (
        <View style={styles.buttonContainer}>
          {enabledSources.includes("camera") && (
            <TouchableOpacity style={styles.actionButton} onPress={handleTakePhoto}>
              <Ionicons name="camera-outline" size={20} color="#6b7280" />
            </TouchableOpacity>
          )}
          {enabledSources.includes("gallery") && (
            <TouchableOpacity style={styles.actionButton} onPress={handleChooseFromGallery}>
              <Ionicons name="image-outline" size={20} color="#6b7280" />
            </TouchableOpacity>
          )}
          {enabledSources.includes("document") && (
            <TouchableOpacity style={styles.actionButton} onPress={handleChooseDocument}>
              <Ionicons name="document-text-outline" size={20} color="#6b7280" />
            </TouchableOpacity>
          )}
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
    gap: 6,
  },
  actionButton: {
    flex: 1,
    backgroundColor: "#f9fafb",
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
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
  localPreviewBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fef3c7",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginBottom: 8,
    gap: 8,
  },
  localPreviewText: {
    fontSize: 12,
    color: "#92400e",
    fontWeight: "500",
  },
});
