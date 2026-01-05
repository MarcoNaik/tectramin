import { useState, useEffect, useRef } from "react";
import {
  View,
  TouchableOpacity,
  Modal,
  StyleSheet,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  Pressable,
  Animated,
  Dimensions,
} from "react-native";
import { Text } from "./Text";
import { useNetworkStatus } from "../hooks/useNetworkStatus";

interface LogoutConfirmationModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const REQUIRED_PHRASE = "Deseo salir de mi cuenta";
const SCREEN_HEIGHT = Dimensions.get("window").height;

export function LogoutConfirmationModal({
  visible,
  onClose,
  onConfirm,
}: LogoutConfirmationModalProps) {
  const [inputValue, setInputValue] = useState("");
  const isOnline = useNetworkStatus();
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  const isConfirmEnabled = inputValue === REQUIRED_PHRASE;

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
      setInputValue("");
    }
  }, [visible, slideAnim]);

  const handleClose = () => {
    Animated.timing(slideAnim, {
      toValue: SCREEN_HEIGHT,
      duration: 200,
      useNativeDriver: true,
    }).start(() => onClose());
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
        <Pressable style={styles.modalOverlay} onPress={handleClose}>
          <Animated.View
            style={[
              styles.modalContent,
              { transform: [{ translateY: slideAnim }] },
            ]}
          >
            <Pressable onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Confirmar Cierre de Sesion</Text>
                <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                  <Text style={styles.modalClose}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.content}>
                {!isOnline && (
                  <View style={styles.warningBox}>
                    <Text style={styles.warningText}>
                      Si estas sin conexion, no podras volver a iniciar sesion
                      hasta tener internet
                    </Text>
                  </View>
                )}

                <Text style={styles.instructions}>
                  Para cerrar sesion, escribe exactamente:
                </Text>
                <Text style={styles.requiredPhrase}>{REQUIRED_PHRASE}</Text>

                <TextInput
                  style={styles.input}
                  value={inputValue}
                  onChangeText={setInputValue}
                  placeholder={REQUIRED_PHRASE}
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                <TouchableOpacity
                  style={[
                    styles.confirmButton,
                    !isConfirmEnabled && styles.confirmButtonDisabled,
                  ]}
                  onPress={onConfirm}
                  disabled={!isConfirmEnabled}
                >
                  <Text
                    style={[
                      styles.confirmButtonText,
                      !isConfirmEnabled && styles.confirmButtonTextDisabled,
                    ]}
                  >
                    Cerrar Sesion
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Animated.View>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
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
  },
  closeButton: {
    padding: 8,
  },
  modalClose: {
    fontSize: 20,
    color: "#6b7280",
  },
  content: {
    padding: 16,
  },
  warningBox: {
    backgroundColor: "#fef3c7",
    borderWidth: 1,
    borderColor: "#f59e0b",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  warningText: {
    color: "#92400e",
    fontSize: 14,
    lineHeight: 20,
  },
  instructions: {
    fontSize: 14,
    color: "#374151",
    marginBottom: 8,
  },
  requiredPhrase: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 16,
    fontStyle: "italic",
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  confirmButton: {
    backgroundColor: "#ef4444",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 12,
  },
  confirmButtonDisabled: {
    backgroundColor: "#fca5a5",
  },
  confirmButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  confirmButtonTextDisabled: {
    color: "#fecaca",
  },
  cancelButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  cancelButtonText: {
    color: "#374151",
    fontSize: 16,
    fontWeight: "500",
  },
});
