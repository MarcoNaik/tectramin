import { useEffect, useRef } from "react";
import {
  View,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Image,
  Platform,
  KeyboardAvoidingView,
  Pressable,
  Animated,
  Dimensions,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { Text } from "./Text";

interface UserProfileModalProps {
  visible: boolean;
  onClose: () => void;
  onLogout: () => void;
  onClearData: () => void;
  imageUrl?: string | null;
  fullName?: string | null;
  email?: string | null;
  role?: string | null;
  isOnline?: boolean;
}

const SCREEN_HEIGHT = Dimensions.get("window").height;

export function UserProfileModal({
  visible,
  onClose,
  onLogout,
  onClearData,
  imageUrl,
  fullName,
  email,
  role,
  isOnline = true,
}: UserProfileModalProps) {
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

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
  const getInitials = (name: string | null | undefined): string => {
    if (!name) return "?";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0][0]?.toUpperCase() || "?";
  };

  const getRoleLabel = (roleValue: string | null | undefined): string => {
    const roleLabels: Record<string, string> = {
      field_worker: "Trabajador de Campo",
      admin: "Administrador",
      supervisor: "Supervisor",
    };
    return roleLabels[roleValue || ""] || roleValue || "Sin rol asignado";
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
                <TouchableOpacity
                  onPress={onClearData}
                  style={[styles.clearDataButton, !isOnline && styles.clearDataButtonDisabled]}
                  disabled={!isOnline}
                >
                  <Feather name="trash-2" size={18} color={isOnline ? "#9ca3af" : "#d1d5db"} />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Mi Perfil</Text>
                <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                  <Text style={styles.modalClose}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.profileSection}>
                {imageUrl ? (
                  <Image source={{ uri: imageUrl }} style={styles.profileImage} />
                ) : (
                  <View style={styles.initialsContainer}>
                    <Text style={styles.initials}>{getInitials(fullName)}</Text>
                  </View>
                )}

                <Text style={styles.fullName}>{fullName || "Usuario"}</Text>
                <Text style={styles.email}>{email || "Sin correo"}</Text>
                <View style={styles.roleBadge}>
                  <Text style={styles.roleText}>{getRoleLabel(role)}</Text>
                </View>
              </View>

              <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
                <Text style={styles.logoutButtonText}>Cerrar Sesion</Text>
              </TouchableOpacity>
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
  clearDataButton: {
    padding: 8,
  },
  clearDataButtonDisabled: {
    opacity: 0.5,
  },
  profileSection: {
    alignItems: "center",
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 16,
  },
  initialsContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#2563eb",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  initials: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "600",
  },
  fullName: {
    fontSize: 20,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 12,
  },
  roleBadge: {
    backgroundColor: "#eff6ff",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  roleText: {
    fontSize: 13,
    color: "#2563eb",
    fontWeight: "500",
  },
  logoutButton: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: "#ef4444",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  logoutButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
