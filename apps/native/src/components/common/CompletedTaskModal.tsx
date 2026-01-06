import { useEffect, useRef, useState } from "react";
import {
  View,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  Modal,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  Animated,
  Dimensions,
  Image,
} from "react-native";
import { Text } from "../Text";
import { ImageViewerModal } from "./ImageViewerModal";

interface AnswerAttachment {
  localUri: string | null;
  fileName: string;
  fileType: string;
  mimeType: string;
}

interface Answer {
  label: string;
  value: string;
  fieldType: string;
  attachment?: AnswerAttachment | null;
}

interface CompletedTaskModalProps {
  visible: boolean;
  onClose: () => void;
  onEdit: () => void;
  taskName: string;
  answers: Answer[];
}

const SCREEN_HEIGHT = Dimensions.get("window").height;

function formatValue(value: string, fieldType: string): string {
  if (!value) return "-";

  switch (fieldType) {
    case "boolean":
      return value === "true" ? "Si" : "No";
    case "date":
      try {
        return new Date(value).toLocaleDateString("es-CL", {
          day: "numeric",
          month: "long",
          year: "numeric",
        });
      } catch {
        return value;
      }
    case "attachment":
      return "Archivo adjunto";
    case "displayText":
      return "";
    default:
      return value;
  }
}

export function CompletedTaskModal({
  visible,
  onClose,
  onEdit,
  taskName,
  answers,
}: CompletedTaskModalProps) {
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const displayAnswers = answers.filter((a) => a.fieldType !== "displayText");
  const [viewerVisible, setViewerVisible] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      slideAnim.setValue(SCREEN_HEIGHT);
    }
  }, [visible, slideAnim]);

  const handleClose = () => {
    Animated.timing(slideAnim, {
      toValue: SCREEN_HEIGHT,
      duration: 200,
      useNativeDriver: true,
    }).start(() => onClose());
  };

  const handleEdit = () => {
    Animated.timing(slideAnim, {
      toValue: SCREEN_HEIGHT,
      duration: 200,
      useNativeDriver: true,
    }).start(() => onEdit());
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent={Platform.OS === "android"}
    >
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={handleClose}>
            <View style={styles.backdrop} />
          </TouchableWithoutFeedback>
          <Animated.View
            style={[
              styles.modalContent,
              { transform: [{ translateY: slideAnim }] },
            ]}
          >
            <View>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle} numberOfLines={2}>
                  {taskName}
                </Text>
                <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                  <Text style={styles.modalClose}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.answersContainer}
                contentContainerStyle={styles.answersContent}
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled={true}
              >
                {displayAnswers.length === 0 ? (
                  <Text style={styles.noAnswersText}>
                    No hay respuestas para mostrar
                  </Text>
                ) : (
                  displayAnswers.map((answer, index) => (
                    <View key={index} style={styles.answerRow}>
                      <Text style={styles.answerLabel}>{answer.label}</Text>
                      {answer.fieldType === "attachment" && answer.attachment ? (
                        answer.attachment.fileType === "image" && answer.attachment.localUri ? (
                          <TouchableOpacity
                            onPress={() => {
                              setSelectedImageUri(answer.attachment!.localUri);
                              setViewerVisible(true);
                            }}
                          >
                            <Image
                              source={{ uri: answer.attachment.localUri }}
                              style={styles.attachmentPreview}
                            />
                          </TouchableOpacity>
                        ) : (
                          <View style={styles.documentPreview}>
                            <Text style={styles.documentIcon}>📄</Text>
                            <Text style={styles.documentName}>{answer.attachment.fileName}</Text>
                          </View>
                        )
                      ) : (
                        <Text style={styles.answerValue}>
                          {formatValue(answer.value, answer.fieldType)}
                        </Text>
                      )}
                    </View>
                  ))
                )}
              </ScrollView>

              <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
                  <Text style={styles.editButtonText}>Editar</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.closeActionButton} onPress={handleClose}>
                  <Text style={styles.closeActionButtonText}>Cerrar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
      {selectedImageUri && (
        <ImageViewerModal
          visible={viewerVisible}
          imageUri={selectedImageUri}
          onClose={() => {
            setViewerVisible(false);
            setSelectedImageUri(null);
          }}
        />
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: "80%",
    paddingBottom: Platform.OS === "android" ? 24 : 0,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    flex: 1,
    marginRight: 8,
  },
  closeButton: {
    padding: 8,
  },
  modalClose: {
    fontSize: 20,
    color: "#6b7280",
  },
  answersContainer: {
    maxHeight: SCREEN_HEIGHT * 0.5,
  },
  answersContent: {
    padding: 16,
  },
  noAnswersText: {
    fontSize: 14,
    color: "#6b7280",
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: 20,
  },
  answerRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  answerLabel: {
    fontSize: 14,
    color: "#374151",
    marginBottom: 6,
    fontWeight: "600",
  },
  answerValue: {
    fontSize: 14,
    color: "#111827",
  },
  buttonContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    gap: 12,
  },
  editButton: {
    backgroundColor: "#2563eb",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  editButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  closeActionButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  closeActionButtonText: {
    color: "#374151",
    fontSize: 16,
    fontWeight: "500",
  },
  attachmentPreview: {
    width: "100%",
    height: 120,
    borderRadius: 8,
    marginTop: 8,
  },
  documentPreview: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9fafb",
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
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
});
