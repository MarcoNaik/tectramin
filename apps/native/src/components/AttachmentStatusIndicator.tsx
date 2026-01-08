import { View, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { Text } from "./Text";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  withSpring,
  withTiming,
  useSharedValue,
  withSequence,
} from "react-native-reanimated";
import { useEffect } from "react";

export type DisplayStatus = "uploading" | "uploaded" | "failed" | "queued";

interface AttachmentStatusIndicatorProps {
  status: DisplayStatus;
  fileSize: number;
  onRetry?: () => void;
}

const STATUS_CONFIG = {
  uploading: {
    color: "#3b82f6",
    backgroundColor: "#dbeafe",
    icon: "cloud-upload-outline" as const,
    text: "Subiendo...",
    showSpinner: true,
  },
  uploaded: {
    color: "#10b981",
    backgroundColor: "#d1fae5",
    icon: "checkmark-circle" as const,
    text: "Subido",
    showSpinner: false,
  },
  failed: {
    color: "#ef4444",
    backgroundColor: "#fee2e2",
    icon: "warning-outline" as const,
    text: "Error al subir",
    showSpinner: false,
  },
  queued: {
    color: "#f59e0b",
    backgroundColor: "#fef3c7",
    icon: "cloud-offline-outline" as const,
    text: "Sin conexión",
    showSpinner: false,
  },
};

export function AttachmentStatusIndicator({
  status,
  fileSize,
  onRetry,
}: AttachmentStatusIndicatorProps) {
  const config = STATUS_CONFIG[status];
  const scale = useSharedValue(0.8);
  const translateX = useSharedValue(0);

  useEffect(() => {
    if (status === "uploaded") {
      scale.value = withSpring(1, { damping: 15, stiffness: 150 });
    } else if (status === "failed") {
      translateX.value = withSequence(
        withTiming(-8, { duration: 50 }),
        withTiming(8, { duration: 100 }),
        withTiming(-8, { duration: 100 }),
        withTiming(8, { duration: 100 }),
        withTiming(0, { duration: 50 })
      );
    } else {
      scale.value = withTiming(1, { duration: 150 });
    }
  }, [status, scale, translateX]);

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Animated.View style={[styles.container, animatedContainerStyle]}>
      <View style={[styles.statusRow, { backgroundColor: config.backgroundColor }]}>
        <View style={styles.statusContent}>
          {config.showSpinner ? (
            <ActivityIndicator size="small" color={config.color} />
          ) : (
            <Animated.View style={animatedIconStyle}>
              <Ionicons name={config.icon} size={18} color={config.color} />
            </Animated.View>
          )}
          <Text style={[styles.statusText, { color: config.color }]}>
            {config.text}
          </Text>
        </View>
        <Text style={styles.fileSize}>{formatFileSize(fileSize)}</Text>
      </View>

      {status === "failed" && onRetry && (
        <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
          <Ionicons name="refresh-outline" size={16} color="#ef4444" />
          <Text style={styles.retryText}>Reintentar</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  statusContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: "500",
  },
  fileSize: {
    fontSize: 12,
    color: "#6b7280",
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#fee2e2",
    paddingVertical: 8,
    borderRadius: 6,
  },
  retryText: {
    color: "#ef4444",
    fontWeight: "500",
    fontSize: 14,
  },
});
