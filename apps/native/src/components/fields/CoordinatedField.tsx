import { useState } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Text } from "../Text";
import { DebouncedTextInput } from "../DebouncedTextInput";
import { ImageViewerModal } from "../common";
import { AttachmentStatusIndicator } from "../AttachmentStatusIndicator";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { recognizeText } from "rn-mlkit-ocr";
import { useAttachments } from "../../hooks/useAttachments";
import { useNetworkStatus } from "../../hooks/useNetworkStatus";
import { compressImage } from "../../services/ImageCompressor";
import { parseCoordinatesFromOCR } from "../../utils/parseCoordinatesFromOCR";
import type { FieldTemplate, AttachmentUploadStatus } from "../../db/types";
import type { DisplayStatus } from "../AttachmentStatusIndicator";

function computeDisplayStatus(
  isLocalPreview: boolean,
  uploadStatus: AttachmentUploadStatus,
  isOnline: boolean
): DisplayStatus {
  if (uploadStatus === "failed") return "failed";
  if (uploadStatus === "uploaded" && !isLocalPreview) return "uploaded";
  if (uploadStatus === "uploading" || isLocalPreview) return "uploading";
  if (uploadStatus === "pending" && !isOnline) return "queued";
  return "uploading";
}

interface CoordinatedFieldProps {
  field: FieldTemplate;
  value: string | undefined;
  onChange: (value: string) => void;
  fieldResponseClientId: string | undefined;
  userId: string;
  ensureFieldResponse: () => Promise<string>;
  formatLabel: (label: string) => string;
  marginBottom?: number;
}

export function CoordinatedField({
  field,
  value,
  onChange,
  fieldResponseClientId,
  userId,
  ensureFieldResponse,
  formatLabel,
  marginBottom = 16,
}: CoordinatedFieldProps) {
  const [loading, setLoading] = useState(false);
  const [viewerVisible, setViewerVisible] = useState(false);

  const { attachment, isLocalPreview, createAttachment, removeAttachment, retryUpload } = useAttachments(
    fieldResponseClientId ?? "",
    userId
  );
  const isOnline = useNetworkStatus();

  let latValue = "";
  let lngValue = "";
  let attachmentClientId = "";

  if (value) {
    try {
      const parsed = JSON.parse(value);
      latValue = parsed.latitude || "";
      lngValue = parsed.longitude || "";
      attachmentClientId = parsed.attachmentClientId || "";
    } catch {
    }
  }

  const handleCoordinateChange = (lat: string, lng: string, attClientId?: string) => {
    const coordValue = JSON.stringify({
      latitude: lat,
      longitude: lng,
      attachmentClientId: attClientId ?? attachmentClientId,
    });
    onChange(coordValue);
  };

  const handleCaptureImage = async () => {
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

        console.log("[CoordinatedField] Starting image compression...");
        const compressed = await compressImage(asset.uri);
        console.log("[CoordinatedField] Compression done:", compressed.uri);

        console.log("[CoordinatedField] Starting OCR detection...");
        const ocrResult = await recognizeText(compressed.uri, "latin");
        console.log("[CoordinatedField] OCR result blocks:", ocrResult.blocks.length);
        const fullText = ocrResult.text;
        console.log("[CoordinatedField] OCR full text:", fullText);
        const parsedCoords = parseCoordinatesFromOCR(fullText);
        console.log("[CoordinatedField] Parsed coords:", parsedCoords);

        const responseClientId = fieldResponseClientId || await ensureFieldResponse();
        const fileName = asset.fileName || `coord_photo_${Date.now()}.jpg`;
        const mimeType = asset.mimeType || "image/jpeg";
        const fileSize = asset.fileSize || 0;

        console.log("[CoordinatedField] Creating attachment...");
        const newAttachmentClientId = await createAttachment({
          fieldResponseClientId: responseClientId,
          uri: compressed.uri,
          fileName,
          mimeType,
          fileSize,
        });
        console.log("[CoordinatedField] Attachment created:", newAttachmentClientId);

        const newLat = parsedCoords?.latitude || latValue;
        const newLng = parsedCoords?.longitude || lngValue;
        handleCoordinateChange(newLat, newLng, newAttachmentClientId);

        if (!parsedCoords) {
          Alert.alert(
            "OCR",
            "No se pudieron detectar coordenadas en la imagen. Puedes ingresarlas manualmente."
          );
        }
      }
    } catch (error) {
      console.error("CoordinatedField image processing error:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("not available") || errorMessage.includes("native module")) {
        Alert.alert(
          "Error",
          "OCR no disponible. Esta función requiere un build de desarrollo, no funciona en Expo Go."
        );
      } else {
        Alert.alert("Error", `Error al procesar la imagen: ${errorMessage}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = () => {
    Alert.alert(
      "Eliminar Imagen",
      "¿Estás seguro de que quieres eliminar esta imagen?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            await removeAttachment();
            handleCoordinateChange(latValue, lngValue, "");
          },
        },
      ]
    );
  };

  const displayStatus = attachment
    ? computeDisplayStatus(isLocalPreview, attachment.uploadStatus as AttachmentUploadStatus, isOnline)
    : null;

  const containerStyle = [styles.fieldContainer, { marginBottom }];

  return (
    <View style={containerStyle}>
      <Text style={styles.fieldLabel}>
        {formatLabel(field.label)}
        {field.isRequired ? " *" : ""}
      </Text>
      {field.subheader && (
        <Text style={styles.fieldSubheader}>{field.subheader}</Text>
      )}

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#2563eb" />
          <Text style={styles.loadingText}>Procesando OCR...</Text>
        </View>
      )}

      {!loading && attachment && displayStatus && (
        <View style={styles.previewContainer}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => setViewerVisible(true)}
          >
            <Image source={{ uri: attachment.localUri ?? "" }} style={styles.imagePreview} />
          </TouchableOpacity>
          <AttachmentStatusIndicator
            status={displayStatus}
            fileSize={attachment.fileSize}
            onRetry={retryUpload}
          />
          <TouchableOpacity style={styles.removeButton} onPress={handleRemove}>
            <Text style={styles.removeButtonText}>Eliminar</Text>
          </TouchableOpacity>
        </View>
      )}

      {!loading && !attachment && (
        <TouchableOpacity style={styles.captureButton} onPress={handleCaptureImage}>
          <Ionicons name="camera-outline" size={24} color="#6b7280" />
          <Text style={styles.captureButtonText}>Capturar Coordenadas</Text>
        </TouchableOpacity>
      )}

      <View style={styles.coordinateContainer}>
        <View style={styles.coordinateField}>
          <Text style={styles.coordinateLabel}>Latitud</Text>
          <DebouncedTextInput
            fieldServerId={`${field.serverId}-lat`}
            style={styles.fieldInput}
            initialValue={latValue}
            onDebouncedChange={(lat) => handleCoordinateChange(lat, lngValue)}
            placeholder="-33.4489"
            keyboardType="numbers-and-punctuation"
            debounceMs={500}
          />
        </View>
        <View style={styles.coordinateField}>
          <Text style={styles.coordinateLabel}>Longitud</Text>
          <DebouncedTextInput
            fieldServerId={`${field.serverId}-lng`}
            style={styles.fieldInput}
            initialValue={lngValue}
            onDebouncedChange={(lng) => handleCoordinateChange(latValue, lng)}
            placeholder="-70.6693"
            keyboardType="numbers-and-punctuation"
            debounceMs={500}
          />
        </View>
      </View>

      {attachment?.localUri && (
        <ImageViewerModal
          visible={viewerVisible}
          imageUri={attachment.localUri}
          onClose={() => setViewerVisible(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fieldContainer: {},
  fieldLabel: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
    color: "#111827",
  },
  fieldSubheader: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 2,
    marginBottom: 6,
  },
  fieldInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
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
    marginBottom: 12,
  },
  loadingText: {
    marginLeft: 8,
    color: "#6b7280",
  },
  captureButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#f9fafb",
    paddingVertical: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 12,
  },
  captureButtonText: {
    fontSize: 16,
    color: "#6b7280",
    fontWeight: "500",
  },
  previewContainer: {
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    gap: 8,
    marginBottom: 12,
  },
  imagePreview: {
    width: "100%",
    height: 150,
    borderRadius: 8,
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
  coordinateContainer: {
    flexDirection: "row",
    gap: 12,
  },
  coordinateField: {
    flex: 1,
  },
  coordinateLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 4,
  },
});
